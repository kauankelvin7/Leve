import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';
import { ZodError } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app as commandApp } from '../../server/app';
import { AppError } from '../../server/errors';
import { createGeminiAdapter, type GeminiTransport } from '../../server/gika/gemini';
import { firestoreReads } from '../../server/gika/reads';
import { createGikaRouter } from '../../server/gika/router';
import type { SemanticTurn } from '../../server/gika/semanticTurn';
import { hashValue } from '../../server/hash';
import { backendLog } from '../../server/logger';
import { auth, db } from '../../server/platform/firebase';
import { gikaInterpretationSchema, taskActivityInput, type GikaRequest } from '../../packages/domain/src/gika';
import { completionEnvelope } from '../../packages/domain/src/gikaCompletion';
import { rescheduleEnvelope } from '../../packages/domain/src/gikaReschedule';
import { updateEnvelope } from '../../packages/domain/src/gikaUpdate';
import { commandEnvelopeSchema, type CommandEnvelope } from '../../packages/domain/src/identity';

const zone = 'America/Sao_Paulo';
const today = () => Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
const tomorrow = () => Temporal.PlainDate.from(today()).add({ days: 1 }).toString();

async function account() {
  const user = await auth.createUser({
    email: `semantic-${randomUUID()}@example.test`, emailVerified: true, password: 'teste-seguro-123',
  });
  const signed = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'teste-seguro-123', returnSecureToken: true }),
  });
  if (!signed.ok) throw new Error('Emulator sign-in failed');
  const { idToken } = await signed.json() as { idToken: string };
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, accountState: 'active', timeZone: zone, weekStartsOn: 1, revision: 1, dataVersion: 1 });
  await db.doc(`memberships/${user.uid}`).set({ state: 'active' });
  return { uid: user.uid, token: idToken };
}

async function seedTask(uid: string, entityId: string, title: string, dueTime: string | null = null) {
  const data = {
    title, descriptionPlain: 'PRIVATE_DESCRIPTION', categoryId: null,
    schedule: { type: 'task', dueDate: today(), dueTime, timeZone: zone, disambiguation: 'reject' },
    reminderSpecs: [], kind: 'task', status: 'pending', revision: 1, schemaVersion: 1,
    deletedAt: null, seriesId: null, occurrenceKey: null,
  };
  await db.doc(`users/${uid}/activities/${entityId}`).set(data);
  return data;
}

function turn(proposals: SemanticTurn['proposals'], domainIntent: SemanticTurn['domainIntent'] = 'AGENDA_ACTION'): SemanticTurn {
  return { domainIntent, certain: true, explicitAction: domainIntent === 'AGENDA_ACTION', reply: null, proposals };
}

function providerResponse(value: unknown) {
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args: value } }] } }] });
}

/** Only upstream transport is controlled. Adapter parsing, authorization, repository,
 * signed confirmation, commands and transactional receipts remain the real modules. */
function harness(provider: () => Response | Promise<Response>) {
  const transport = vi.fn<GeminiTransport>(async () => provider());
  const adapter = createGeminiAdapter(transport);
  const isolatedApp = express();
  isolatedApp.use(async (incoming, response, next) => {
    response.locals.correlationId = randomUUID();
    response.setHeader('X-Correlation-ID', response.locals.correlationId);
    const token = incoming.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Entre na sua conta para continuar.');
    response.locals.identity = await auth.verifyIdToken(token, true);
    next();
  });
  isolatedApp.use('/api/gika', createGikaRouter(adapter, firestoreReads));
  const errors: ErrorRequestHandler = (error, _incoming, response, _next) => {
    const correlationId = response.locals.correlationId;
    if (error instanceof AppError) {
      backendLog(error.status >= 500 ? 'error' : 'warn', 'backend.operation_rejected', {
        correlationId, status: error.status, publicCode: error.code,
      }, error);
      response.status(error.status).json({ code: error.code, message: error.message, correlationId });
      return;
    }
    if (error instanceof ZodError) {
      response.status(422).json({ code: 'VALIDATION_ERROR', correlationId });
      return;
    }
    backendLog('error', 'backend.unexpected_error', { correlationId }, error);
    response.status(503).json({ code: 'SERVICE_UNAVAILABLE', correlationId });
  };
  isolatedApp.use(errors);
  return {
    transport,
    ask: (token: string, input: GikaRequest) => request(isolatedApp).post('/api/gika/respond').set('Authorization', `Bearer ${token}`).send(input),
  };
}

function dispatch(token: string, command: CommandEnvelope) {
  return request(commandApp).post('/api/commands').set('Authorization', `Bearer ${token}`).send(command);
}

function expectSingleTurn(transport: ReturnType<typeof harness>['transport']) {
  expect(transport).toHaveBeenCalledTimes(1);
  const payload = JSON.stringify(transport.mock.calls[0]![0]);
  expect(payload).toContain('respond_turn');
  expect(payload).not.toContain('classify_intent');
  expect(payload).not.toContain('candidateCount');
  expect(payload).toContain('MEDIUM');
}

beforeEach(async () => {
  // Never use this suite to create accounts or alter documents outside emulators.
  expect(process.env.FIREBASE_PROJECT_ID).toBe('demo-leve');
  expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeTruthy();
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBeTruthy();
  const cleared = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-leve/databases/(default)/documents`, { method: 'DELETE' });
  expect(cleared.ok).toBe(true);
  const users = await auth.listUsers();
  if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ mode: 'normal' });
});
afterEach(() => vi.restoreAllMocks());

describe('semantic turn through real adapter, Auth/Firestore emulators and command layer', () => {
  it('natural creation returns a descriptor; command persists once and receipt recovery makes no second upstream call', async () => {
    const user = await account(), other = await account();
    const input = { requestId: randomUUID(), text: 'Me ajuda colocando Lavar mochila na agenda de amanhã às 18h.' };
    const args = { title: 'Lavar mochila', dueDate: tomorrow(), dueTime: '18:00' };
    const controlled = harness(() => providerResponse(turn([{ name: 'create_task', args }])));
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.createTask).toEqual({ ...args, timeZone: zone });
    expect(parsed.reads).toEqual([]);
    expect(response.body).not.toHaveProperty('createdTask');
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    expectSingleTurn(controlled.transport);

    const command = commandEnvelopeSchema.parse({
      command: 'activity.create', operationId: input.requestId, entityId: input.requestId, expectedRevision: 0,
      gika: { requestTextHash: hashValue(input.text) }, payload: taskActivityInput(parsed.createTask!),
    });
    const applied = await dispatch(user.token, command).expect(200);
    expect(applied.body).toMatchObject({ result: 'applied', operationId: input.requestId, entityId: input.requestId, revision: 1 });
    controlled.transport.mockImplementation(async () => { throw new Error('Receipt recovery must not call upstream'); });
    const recovered = await controlled.ask(user.token, input).expect(200);
    expect(recovered.body.createTask).toEqual(parsed.createTask);
    const retry = await dispatch(user.token, command).expect(200);
    expect(retry.body).toEqual({ ...applied.body, result: 'alreadyApplied' });
    expectSingleTurn(controlled.transport);
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(1);
    expect((await db.collection(`users/${other.uid}/activities`).get()).size).toBe(0);
    expect((await db.doc(`users/${user.uid}/activities/${input.requestId}`).get()).data()).toMatchObject({
      title: args.title, schedule: { dueDate: args.dueDate, dueTime: args.dueTime, timeZone: zone }, revision: 1,
    });
    expect((await db.doc(`commandReceipts/${user.uid}_${input.requestId}`).get()).data()).toMatchObject({
      uid: user.uid, gika: { requestTextHash: hashValue(input.text), task: parsed.createTask },
    });
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
    expect((await db.doc(`users/${user.uid}`).get()).data()?.dataVersion).toBe(2);
  });

  it('natural query reads only the authenticated account and never exposes agenda documents to upstream', async () => {
    const user = await account(), other = await account();
    const before = await seedTask(user.uid, 'mine', 'Meu compromisso privado');
    await seedTask(other.uid, 'other', 'OTHER_ACCOUNT_SECRET');
    const read = vi.spyOn(firestoreReads, 'read');
    const controlled = harness(() => providerResponse(turn([{ name: 'get_today', args: {} }], 'AGENDA_QUERY')));
    const input = { requestId: randomUUID(), text: 'Me conta quais compromissos apareceram no meu dia.' };
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.reads).toHaveLength(1);
    expect(parsed.reads[0]).toMatchObject({ startDate: today(), endDate: today(), timeZone: zone, partial: false, cached: false });
    expect(parsed.reads[0]!.items).toHaveLength(1);
    expect(parsed.reads[0]!.items[0]).toMatchObject({ id: 'mine', title: before.title, revision: 1 });
    expect(read).toHaveBeenCalledWith(user.uid, { startDate: today(), endDate: today(), timeZone: zone });
    expectSingleTurn(controlled.transport);
    const sent = JSON.stringify(controlled.transport.mock.calls[0]![0]);
    expect(sent).toContain(input.text);
    expect(sent).toContain(today());
    expect(sent).toContain(zone);
    expect(sent).not.toContain(before.title);
    expect(sent).not.toMatch(/PRIVATE_DESCRIPTION|OTHER_ACCOUNT_SECRET/);
    expect(JSON.stringify(response.body)).not.toMatch(/PRIVATE_DESCRIPTION|OTHER_ACCOUNT_SECRET/);
    for (const field of ['createTask', 'completeTask', 'updateTask', 'rescheduleTask', 'confirmation']) expect(response.body).not.toHaveProperty(field);
    expect((await db.doc(`users/${user.uid}/activities/mine`).get()).data()).toEqual(before);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });

  it.each(['complete', 'update'] as const)('natural %s resolves a software-owned descriptor and uses the existing command/revision/receipt', async operation => {
    const user = await account();
    const target = `semantic-${operation}`;
    const before = await seedTask(user.uid, target, 'Ler artigo');
    const input = {
      requestId: randomUUID(),
      text: operation === 'complete'
        ? 'A tarefa Ler artigo de hoje já ficou pronta; pode deixá-la concluída na agenda.'
        : 'Na tarefa Ler artigo de hoje, o nome deveria ser Ler artigo de ciência. Ajusta isso pra mim?',
    };
    const proposal: SemanticTurn['proposals'][number] = operation === 'complete'
      ? { name: 'complete_task', args: { title: before.title, date: null } }
      : { name: 'update_task', args: { title: before.title, date: null, patch: { title: 'Ler artigo de ciência' } } };
    const controlled = harness(() => providerResponse(turn([proposal])));
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    const descriptor = operation === 'complete' ? parsed.completeTask : parsed.updateTask;
    expect(descriptor).toMatchObject({ id: target, title: before.title, dueDate: today(), timeZone: zone, revision: 1 });
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toEqual(before);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    const command = operation === 'complete'
      ? await completionEnvelope(parsed.completeTask!, input)
      : await updateEnvelope(parsed.updateTask!, input);
    const applied = await dispatch(user.token, command).expect(200);
    expect(applied.body).toMatchObject({ result: 'applied', operationId: input.requestId, entityId: target, revision: 2 });
    const after = (await db.doc(`users/${user.uid}/activities/${target}`).get()).data()!;
    expect(after).toMatchObject({
      title: operation === 'update' ? 'Ler artigo de ciência' : before.title,
      status: operation === 'complete' ? 'completed' : 'pending', revision: 2,
      descriptionPlain: before.descriptionPlain, schedule: before.schedule,
    });
    controlled.transport.mockImplementation(async () => { throw new Error('Receipt recovery must not call upstream'); });
    const recovered = await controlled.ask(user.token, input).expect(200);
    expect(operation === 'complete' ? recovered.body.completeTask : recovered.body.updateTask).toEqual(descriptor);
    await dispatch(user.token, command).expect(200).expect(result => expect(result.body.result).toBe('alreadyApplied'));
    expectSingleTurn(controlled.transport);
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);
  });

  it('natural reschedule requires the original HMAC contract: tamper is rejected before writes, valid command increments once', async () => {
    const user = await account(), other = await account();
    const target = 'semantic-walk';
    const before = await seedTask(user.uid, target, 'Caminhada', '07:00');
    const otherBefore = await seedTask(other.uid, target, 'Caminhada', '07:00');
    const input = { requestId: randomUUID(), text: '  A caminhada de hoje vai ficar melhor amanhã. Pode fazer essa troca na agenda?  ' };
    const args = { title: before.title, date: null, patch: { dueDate: tomorrow() } };
    const controlled = harness(() => providerResponse(turn([{ name: 'reschedule_task', args }])));
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.rescheduleTask).toMatchObject({ id: target, title: before.title, dueDate: today(), dueTime: '07:00', revision: 1, patch: args.patch });
    expect(parsed.confirmation).toMatchObject({
      policy: { kind: 'confirm', reason: 'RESCHEDULE_PREVIEW_REQUIRED' },
      action: { task: parsed.rescheduleTask }, summary: { changedFields: ['dueDate'] },
    });
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toEqual(before);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    const token = parsed.confirmation!.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    const [encoded, signature] = token.split('.') as [string, string];
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    expect(claims).toMatchObject({ uid: user.uid, requestId: input.requestId, requestTextHash: hashValue(input.text.trim()), preview: { action: { task: parsed.rescheduleTask } } });
    expect(claims.expiresAt - claims.issuedAt).toBe(15 * 60_000);
    const command = await rescheduleEnvelope(parsed.rescheduleTask!, input, token);
    const tampered = {
      ...command,
      gikaReschedule: { ...command.gikaReschedule!, confirmationToken: `${encoded}.${signature[0] === '0' ? '1' : '0'}${signature.slice(1)}` },
    };
    const rejected = await dispatch(user.token, tampered).expect(422);
    expect(rejected.body.code).toBe('GIKA_CONFIRMATION_INVALID');
    expect(rejected.body.correlationId).toBe(rejected.headers['x-correlation-id']);
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toEqual(before);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    await dispatch(other.token, command).expect(422);
    expect((await db.doc(`users/${other.uid}/activities/${target}`).get()).data()).toEqual(otherBefore);

    await dispatch(user.token, command).expect(200).expect(result => expect(result.body).toMatchObject({ result: 'applied', entityId: target, operationId: input.requestId, revision: 2 }));
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toMatchObject({
      revision: 2, title: before.title, descriptionPlain: before.descriptionPlain,
      schedule: { ...before.schedule, dueDate: args.patch.dueDate },
    });
    const receipt = (await db.doc(`commandReceipts/${user.uid}_${input.requestId}`).get()).data()!;
    expect(receipt.gikaReschedule).toMatchObject({ requestTextHash: hashValue(input.text.trim()), confirmationToken: token, task: parsed.rescheduleTask });
    controlled.transport.mockImplementation(async () => { throw new Error('Confirmation recovery must not call upstream'); });
    const recovered = await controlled.ask(user.token, input).expect(200);
    expect(recovered.body.confirmation).toEqual(parsed.confirmation);
    await dispatch(user.token, command).expect(200).expect(result => expect(result.body.result).toBe('alreadyApplied'));
    expectSingleTurn(controlled.transport);
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
    expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);
  });

  it.each(['query', 'create'] as const)('revoked membership during %s turn denies all agenda data and descriptors after the real upstream response', async operation => {
    const user = await account();
    const before = await seedTask(user.uid, 'revoked', 'PRIVATE_REVOKED_TASK');
    const proposal: SemanticTurn['proposals'][number] = operation === 'query'
      ? { name: 'get_today', args: {} }
      : { name: 'create_task', args: { title: 'Lavar mochila', dueDate: tomorrow(), dueTime: null } };
    const controlled = harness(async () => {
      await db.doc(`memberships/${user.uid}`).update({ state: 'suspended' });
      return providerResponse(turn([proposal], operation === 'query' ? 'AGENDA_QUERY' : 'AGENDA_ACTION'));
    });
    const read = vi.spyOn(firestoreReads, 'read');
    const response = await controlled.ask(user.token, {
      requestId: randomUUID(), text: operation === 'query' ? 'Me conta quais compromissos apareceram no meu dia.' : 'Me ajuda colocando Lavar mochila na agenda de amanhã.',
    }).expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(JSON.stringify(response.body)).not.toContain(before.title);
    for (const field of ['reads', 'createTask', 'completeTask', 'updateTask', 'rescheduleTask', 'confirmation']) expect(response.body).not.toHaveProperty(field);
    expect(read).not.toHaveBeenCalled();
    expectSingleTurn(controlled.transport);
    expect((await db.doc(`users/${user.uid}/activities/revoked`).get()).data()).toEqual(before);
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(1);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });

  it('upstream failure logs only correlation and sanitized status, omitting the current prompt, credentials and response headers/body', async () => {
    const user = await account();
    const prompt = 'PRIVATE_CURRENT_PROMPT';
    const header = 'PRIVATE_UPSTREAM_HEADER';
    const body = 'PRIVATE_UPSTREAM_BODY';
    const fakeKey = 'PRIVATE_SYNTHETIC_API_KEY';
    const captures = [vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'debug')];
    for (const capture of captures) capture.mockImplementation(() => {});
    const controlled = harness(() => Response.json({ error: { message: `${body} ${prompt} ${fakeKey}` } }, {
      status: 503, headers: { 'x-private-debug': header, 'x-goog-api-key': fakeKey },
    }));
    const response = await controlled.ask(user.token, { requestId: randomUUID(), text: `Mostra a agenda: ${prompt}` }).expect(503);
    expect(response.body.code).toBe('GIKA_UNAVAILABLE');
    const records = captures.flatMap(capture => capture.mock.calls).map(call => JSON.parse(call[0] as string));
    expect(records).toContainEqual(expect.objectContaining({
      event: 'gika.upstream.response', correlationId: response.body.correlationId, upstreamStatus: 503,
    }));
    const serialized = JSON.stringify(records);
    for (const value of [prompt, header, body, fakeKey, user.token]) expect(serialized).not.toContain(value);
    for (const record of records) {
      for (const field of ['prompt', 'requestBody', 'responseBody', 'headers', 'authorization', 'uid']) expect(record).not.toHaveProperty(field);
    }
    expect(response.body.correlationId).toBe(response.headers['x-correlation-id']);
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
});
