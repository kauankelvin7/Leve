import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app as commandApp } from '../../server/app';
import { AppError } from '../../server/errors';
import { createGeminiAdapter, type GeminiTransport } from '../../server/gika/gemini';
import { firestoreReads } from '../../server/gika/reads';
import { createGikaRouter } from '../../server/gika/router';
import { hashValue } from '../../server/hash';
import { backendLog } from '../../server/logger';
import { auth, db } from '../../server/platform/firebase';
import { gikaInterpretationSchema, type GikaRequest } from '../../packages/domain/src/gika';
import { shoppingListEnvelope } from '../../packages/domain/src/gikaShopping';

const zone = 'America/Sao_Paulo';
const requestText = 'Prepara uma lista de compras com o nome Mercado da semana pra mim.';

async function account() {
  const user = await auth.createUser({
    email: `shopping-gika-${randomUUID()}@example.test`, emailVerified: true, password: 'teste-seguro-123',
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

async function seedList(uid: string, entityId: string, title: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const data = {
    title, listKind: 'regular', cycleKey: null, sourceTemplateId: null, archivedAt: null,
    itemCount: 2, pendingItemCount: 1, revision: 1, schemaVersion: 1, deletedAt: null,
    createdAt: now, updatedAt: now, privateNotes: 'PRIVATE_LIST_CONTENT', ...extra,
  };
  await db.doc(`users/${uid}/shoppingLists/${entityId}`).set(data);
  return data;
}

function semantic(proposals: { name: string; args: Record<string, unknown> }[], domainIntent = 'AGENDA_ACTION') {
  return { domainIntent, certain: true, explicitAction: domainIntent === 'AGENDA_ACTION', reply: null, proposals };
}
function providerResponse(value: unknown) {
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args: value } }] } }] });
}

/** Same integration boundary as gika-semantic: real Gemini adapter and repository,
 * controlled provider transport, actual emulator authentication and command route. */
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
      backendLog(error.status >= 500 ? 'error' : 'warn', 'backend.operation_rejected', { correlationId, status: error.status, publicCode: error.code }, error);
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
const createHarness = () => harness(() => providerResponse(semantic([{ name: 'create_shopping_list', args: { title: 'Mercado da semana' } }])));
const queryHarness = () => harness(() => providerResponse(semantic([{ name: 'get_shopping_lists', args: {} }], 'AGENDA_QUERY')));
const dispatch = (token: string, command: object) => request(commandApp).post('/api/commands').set('Authorization', `Bearer ${token}`).send(command);

beforeEach(async () => {
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

describe('Gika shopping list proposals with real emulator commands and receipts', () => {
  it('creates one empty regular list, then recovers the receipt without upstream/quota even while service is restricted', async () => {
    const user = await account(), other = await account();
    const input = { requestId: randomUUID(), text: requestText };
    const controlled = createHarness();
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.createShoppingList).toEqual({ title: 'Mercado da semana' });
    expect(parsed.reads).toEqual([]);
    expect(response.body).not.toHaveProperty('createdShoppingList');
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    const command = await shoppingListEnvelope(parsed.createShoppingList!, input);
    expect(command).toEqual({
      command: 'shoppingList.create', operationId: input.requestId, entityId: input.requestId,
      expectedRevision: 0, payload: { title: 'Mercado da semana', listKind: 'regular', cycleKey: null },
      gikaShopping: { requestTextHash: hashValue(input.text) },
    });
    const applied = await dispatch(user.token, command).expect(200);
    expect(applied.body).toMatchObject({ result: 'applied', operationId: input.requestId, entityId: input.requestId, revision: 1 });
    expect((await db.doc(`users/${user.uid}/shoppingLists/${input.requestId}`).get()).data()).toMatchObject({
      title: 'Mercado da semana', listKind: 'regular', cycleKey: null, sourceTemplateId: null,
      archivedAt: null, deletedAt: null, itemCount: 0, pendingItemCount: 0, revision: 1,
    });
    const quotaBefore = (await db.doc(`usageBuckets/${user.uid}_gika`).get()).data();
    controlled.transport.mockImplementation(async () => { throw new Error('Shopping receipt recovery must not call upstream'); });
    await db.doc('serviceControls/global').update({ mode: 'restricted' });
    const recovered = await controlled.ask(user.token, input).expect(200);
    expect(recovered.body.createShoppingList).toEqual(parsed.createShoppingList);
    const repeated = await dispatch(user.token, command).expect(200);
    expect(repeated.body).toEqual({ ...applied.body, result: 'alreadyApplied' });
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.doc(`usageBuckets/${user.uid}_gika`).get()).data()).toEqual(quotaBefore);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
    expect((await db.collection(`users/${other.uid}/shoppingLists`).get()).size).toBe(0);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
    expect((await db.doc(`commandReceipts/${user.uid}_${input.requestId}`).get()).data()).toMatchObject({
      uid: user.uid, gikaShopping: { requestTextHash: hashValue(input.text), list: parsed.createShoppingList },
    });
    expect((await db.doc(`users/${user.uid}/internal/counts`).get()).data()?.shoppingLists).toBe(1);
    expect((await db.doc(`users/${user.uid}`).get()).data()?.dataVersion).toBe(2);

    await controlled.ask(user.token, { ...input, text: `${requestText} Outro pedido.` }).expect(409).expect(result => expect(result.body.code).toBe('OPERATION_MISMATCH'));
    await dispatch(user.token, { ...command, payload: { title: 'Outra lista', listKind: 'regular', cycleKey: null } }).expect(409).expect(result => expect(result.body.code).toBe('OPERATION_MISMATCH'));
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
  });

  it('canonical payload, stable identity and mutually exclusive Gika metadata reject tampering before any write', async () => {
    const user = await account();
    const input = { requestId: randomUUID(), text: requestText };
    const controlled = createHarness();
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    const command = await shoppingListEnvelope(parsed.createShoppingList!, input);
    const digest = hashValue(input.text), fakeToken = `${Buffer.from('{}').toString('base64url')}.${'a'.repeat(64)}`;
    const variants = [
      { ...command, entityId: randomUUID() },
      { ...command, expectedRevision: 1 },
      { ...command, command: 'shoppingList.update' },
      { ...command, payload: { title: 'Mercado da semana', listKind: 'template', cycleKey: null } },
      { ...command, payload: { title: 'Mercado da semana', listKind: 'cycle', cycleKey: '2026-10' } },
      { ...command, payload: { title: 'Mercado da semana', listKind: 'regular', cycleKey: '2026-10' } },
      { ...command, payload: { title: ' Mercado da semana ', listKind: 'regular', cycleKey: null } },
      { ...command, payload: { title: 'Mercado da semana', listKind: 'regular', cycleKey: null, items: ['PRIVATE_ITEM_NAME'] } },
      { ...command, gikaShopping: { requestTextHash: digest, uid: user.uid } },
      { ...command, gika: { requestTextHash: digest } },
      { ...command, gikaCompletion: { requestTextHash: digest } },
      { ...command, gikaUpdate: { requestTextHash: digest } },
      { ...command, gikaReschedule: { requestTextHash: digest } },
      { ...command, gikaRecurrence: { requestTextHash: digest, confirmationToken: fakeToken } },
      { ...command, gikaUndo: { uid: user.uid, creationOperationId: input.requestId } },
      { ...command, gikaBatch: { requestId: input.requestId, requestTextHash: digest, index: 0, confirmationToken: fakeToken } },
    ];
    for (const value of variants) await dispatch(user.token, value).expect(422);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(0);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    expect((await db.doc(`users/${user.uid}`).get()).data()?.dataVersion).toBe(1);
    await dispatch(user.token, command).expect(200);
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
  });

  it.each(['hash', 'listTitle'] as const)('corrupted shopping receipt %s fails closed without provider or additional quota', async field => {
    const user = await account();
    const input = { requestId: randomUUID(), text: requestText };
    const controlled = createHarness();
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    const command = await shoppingListEnvelope(parsed.createShoppingList!, input);
    await dispatch(user.token, command).expect(200);
    const listRef = db.doc(`users/${user.uid}/shoppingLists/${input.requestId}`);
    const before = (await listRef.get()).data();
    const quotaBefore = (await db.doc(`usageBuckets/${user.uid}_gika`).get()).data();
    const receiptRef = db.doc(`commandReceipts/${user.uid}_${input.requestId}`);
    await receiptRef.update(field === 'hash'
      ? { hash: 'b'.repeat(64) }
      : { 'gikaShopping.list.title': 'Outro título válido mas não comprometido' });
    controlled.transport.mockImplementation(async () => { throw new Error('Corrupt receipts must not call upstream'); });
    const recovered = await controlled.ask(user.token, input).expect(503);
    expect(recovered.body.code).toBe('GIKA_INVALID_RESPONSE');
    expect(recovered.body.correlationId).toBe(recovered.headers['x-correlation-id']);
    expect(recovered.body).not.toHaveProperty('createShoppingList');
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.doc(`usageBuckets/${user.uid}_gika`).get()).data()).toEqual(quotaBefore);
    expect((await listRef.get()).data()).toEqual(before);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
  });

  it('the same request ID in another UID invokes its own provider and command instead of recovering the first account receipt', async () => {
    const first = await account(), second = await account();
    const input = { requestId: randomUUID(), text: requestText };
    const firstProvider = createHarness(), secondProvider = createHarness();
    const firstResponse = await firstProvider.ask(first.token, input).expect(200);
    const firstParsed = gikaInterpretationSchema.parse(firstResponse.body);
    const firstCommand = await shoppingListEnvelope(firstParsed.createShoppingList!, input);
    await dispatch(first.token, firstCommand).expect(200);
    expect((await db.doc(`commandReceipts/${second.uid}_${input.requestId}`).get()).exists).toBe(false);
    const secondResponse = await secondProvider.ask(second.token, input).expect(200);
    expect(secondProvider.transport).toHaveBeenCalledTimes(1);
    const secondParsed = gikaInterpretationSchema.parse(secondResponse.body);
    const secondCommand = await shoppingListEnvelope(secondParsed.createShoppingList!, input);
    await dispatch(second.token, secondCommand).expect(200).expect(result => expect(result.body.result).toBe('applied'));
    expect(firstProvider.transport).toHaveBeenCalledTimes(1);
    for (const user of [first, second]) {
      expect((await db.doc(`commandReceipts/${user.uid}_${input.requestId}`).get()).data()?.uid).toBe(user.uid);
      expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
      expect((await db.doc(`usageBuckets/${user.uid}_gika`).get()).data()?.gikaRequestTimesMs).toHaveLength(1);
    }
    expect((await db.collection('commandReceipts').get()).size).toBe(2);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
  });

  it.each(['missing', 'invalid', 'restricted'] as const)('%s controls deny a new Gika shopping command but preserve exact committed receipt replay', async controlState => {
    const user = await account(), controlled = createHarness();
    const committedInput = { requestId: randomUUID(), text: requestText };
    const committedResponse = await controlled.ask(user.token, committedInput).expect(200);
    const committed = await shoppingListEnvelope(gikaInterpretationSchema.parse(committedResponse.body).createShoppingList!, committedInput);
    const applied = await dispatch(user.token, committed).expect(200);
    const pendingInput = { requestId: randomUUID(), text: requestText };
    const pendingResponse = await controlled.ask(user.token, pendingInput).expect(200);
    const pending = await shoppingListEnvelope(gikaInterpretationSchema.parse(pendingResponse.body).createShoppingList!, pendingInput);
    const quotaBefore = (await db.doc(`usageBuckets/${user.uid}_gika`).get()).data();
    if (controlState === 'missing') await db.doc('serviceControls/global').delete();
    else await db.doc('serviceControls/global').update({ mode: controlState === 'invalid' ? 'unknown-service-mode' : 'restricted' });
    await dispatch(user.token, pending).expect(503).expect(result => expect(result.body.code).toBe('SERVICE_RESTRICTED'));
    controlled.transport.mockImplementation(async () => { throw new Error('Controls/recovery must not call upstream'); });
    const recovered = await controlled.ask(user.token, committedInput).expect(200);
    expect(recovered.body.createShoppingList).toEqual(committedResponse.body.createShoppingList);
    const replay = await dispatch(user.token, committed).expect(200);
    expect(replay.body).toEqual({ ...applied.body, result: 'alreadyApplied' });
    await controlled.ask(user.token, pendingInput).expect(503).expect(result => expect(result.body.code).toBe('GIKA_UNAVAILABLE'));
    expect(controlled.transport).toHaveBeenCalledTimes(2);
    expect((await db.doc(`usageBuckets/${user.uid}_gika`).get()).data()).toEqual(quotaBefore);
    expect((await db.doc(`users/${user.uid}/shoppingLists/${pendingInput.requestId}`).get()).exists).toBe(false);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(1);
    expect((await db.doc(`users/${user.uid}`).get()).data()?.dataVersion).toBe(2);
  });

  it('shopping query is account-isolated and reads active regular/template/cycle summaries without sending list or item contents upstream', async () => {
    const user = await account(), other = await account();
    const before = await seedList(user.uid, 'mine', 'Meu mercado privado');
    await seedList(user.uid, 'archived', 'ARCHIVED_LIST_SECRET', { archivedAt: new Date().toISOString() });
    await seedList(user.uid, 'trashed', 'TRASHED_LIST_SECRET', { deletedAt: new Date().toISOString() });
    const templateBefore = await seedList(user.uid, 'template', 'Modelo privado', { listKind: 'template' });
    const cycleBefore = await seedList(user.uid, 'cycle', 'Ciclo privado', { listKind: 'cycle', cycleKey: '2026-10' });
    await seedList(other.uid, 'foreign', 'OTHER_ACCOUNT_SECRET');
    const itemRef = db.doc(`users/${user.uid}/shoppingLists/mine/items/private-item`);
    const itemBefore = { name: 'PRIVATE_ITEM_NAME', revision: 1, checked: false };
    await itemRef.set(itemBefore);
    const controlled = queryHarness();
    const input = { requestId: randomUUID(), text: 'Quais listas de compras tenho disponíveis?' };
    const response = await controlled.ask(user.token, input).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.reads).toEqual([]);
    expect(parsed.shoppingLists).toEqual({
      items: [
        { id: 'cycle', title: cycleBefore.title, listKind: 'cycle', revision: 1, itemCount: 2, pendingItemCount: 1 },
        { id: 'mine', title: before.title, listKind: 'regular', revision: 1, itemCount: 2, pendingItemCount: 1 },
        { id: 'template', title: templateBefore.title, listKind: 'template', revision: 1, itemCount: 2, pendingItemCount: 1 },
      ], partial: false, cached: false,
    });
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    const payload = JSON.stringify(controlled.transport.mock.calls[0]![0]);
    expect(payload).toContain(input.text);
    for (const privateValue of [before.title, templateBefore.title, cycleBefore.title, user.uid, other.uid, 'PRIVATE_ITEM_NAME', 'PRIVATE_LIST_CONTENT', 'OTHER_ACCOUNT_SECRET']) expect(payload).not.toContain(privateValue);
    expect(JSON.stringify(response.body)).not.toMatch(/ARCHIVED_LIST_SECRET|TRASHED_LIST_SECRET|OTHER_ACCOUNT_SECRET|PRIVATE_ITEM_NAME|PRIVATE_LIST_CONTENT/);
    expect((await db.doc(`users/${user.uid}/shoppingLists/mine`).get()).data()).toEqual(before);
    expect((await db.doc(`users/${user.uid}/shoppingLists/template`).get()).data()).toEqual(templateBefore);
    expect((await db.doc(`users/${user.uid}/shoppingLists/cycle`).get()).data()).toEqual(cycleBefore);
    expect((await itemRef.get()).data()).toEqual(itemBefore);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
    expect((await db.collectionGroup('items').get()).size).toBe(1);
  });

  it('saturated 50-list read is bounded and explicitly partial', async () => {
    const user = await account();
    await Promise.all(Array.from({ length: 51 }, (_, index) => seedList(user.uid, `list-${index}`, `Lista ${index}`)));
    const controlled = queryHarness();
    const response = await controlled.ask(user.token, { requestId: randomUUID(), text: 'Mostra minhas listas de compras.' }).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.shoppingLists).toMatchObject({ partial: true, cached: false });
    expect(parsed.shoppingLists!.items).toHaveLength(50);
    expect(new Set(parsed.shoppingLists!.items.map(item => item.id)).size).toBe(50);
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(51);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });

  it('malformed list summaries are omitted with partial instead of producing a fabricated complete answer', async () => {
    const user = await account();
    await seedList(user.uid, 'valid', 'Lista válida');
    const broken = await seedList(user.uid, 'broken', 'PRIVATE_MALFORMED_LIST', { revision: -1 });
    const controlled = queryHarness();
    const response = await controlled.ask(user.token, { requestId: randomUUID(), text: 'Mostra minhas listas de compras.' }).expect(200);
    const parsed = gikaInterpretationSchema.parse(response.body);
    expect(parsed.shoppingLists).toEqual({
      items: [{ id: 'valid', title: 'Lista válida', listKind: 'regular', revision: 1, itemCount: 2, pendingItemCount: 1 }], partial: true, cached: false,
    });
    expect(JSON.stringify(response.body)).not.toContain(broken.title);
    expect((await db.doc(`users/${user.uid}/shoppingLists/broken`).get()).data()).toEqual(broken);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });

  it.each(['query', 'create'] as const)('membership revoked during shopping %s denies data/descriptors before read or effects', async operation => {
    const user = await account();
    const before = await seedList(user.uid, 'private', 'PRIVATE_REVOKED_LIST');
    const controlled = harness(async () => {
      await db.doc(`memberships/${user.uid}`).update({ state: 'suspended' });
      return providerResponse(semantic(operation === 'query'
        ? [{ name: 'get_shopping_lists', args: {} }]
        : [{ name: 'create_shopping_list', args: { title: 'Mercado da semana' } }], operation === 'query' ? 'AGENDA_QUERY' : 'AGENDA_ACTION'));
    });
    const read = vi.spyOn(firestoreReads, 'readShoppingLists');
    const response = await controlled.ask(user.token, { requestId: randomUUID(), text: operation === 'query' ? 'Quais listas de compras tenho?' : requestText }).expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(JSON.stringify(response.body)).not.toContain(before.title);
    for (const field of ['shoppingLists', 'createShoppingList', 'createdShoppingList']) expect(response.body).not.toHaveProperty(field);
    expect(read).not.toHaveBeenCalled();
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.doc(`users/${user.uid}/shoppingLists/private`).get()).data()).toEqual(before);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(1);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });

  it('shopping repository failure preserves correlation and real upstream status while sanitizing prompt, headers and database error', async () => {
    const user = await account();
    const prompt = 'PRIVATE_SHOPPING_PROMPT', privateError = 'PRIVATE_DATABASE_ERROR', privateHeader = 'PRIVATE_HEADER';
    const captures = [vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'debug')];
    for (const capture of captures) capture.mockImplementation(() => {});
    vi.spyOn(firestoreReads, 'readShoppingLists').mockRejectedValueOnce(new Error(privateError, { cause: new Error(`Authorization: Bearer ${privateHeader}`) }));
    const controlled = queryHarness();
    const response = await controlled.ask(user.token, { requestId: randomUUID(), text: `Mostra minhas listas de compras. ${prompt}` }).expect(503);
    expect(response.body.code).toBe('GIKA_UNAVAILABLE');
    expect(response.body.correlationId).toBe(response.headers['x-correlation-id']);
    const records = captures.flatMap(capture => capture.mock.calls).map(call => JSON.parse(call[0] as string));
    expect(records).toContainEqual(expect.objectContaining({ event: 'gika.upstream.response', correlationId: response.body.correlationId, upstreamStatus: 200 }));
    const failedRead = records.find(record => record.event === 'gika.diagnostic' && record.stage === 'read');
    expect(failedRead).toMatchObject({ correlationId: response.body.correlationId, errorClass: 'Error' });
    expect(failedRead).not.toHaveProperty('upstreamStatus');
    const serialized = JSON.stringify(records);
    for (const value of [prompt, privateError, privateHeader, user.token]) expect(serialized).not.toContain(value);
    for (const field of ['shoppingLists', 'createShoppingList', 'createdShoppingList']) expect(response.body).not.toHaveProperty(field);
    expect(controlled.transport).toHaveBeenCalledTimes(1);
    expect((await db.collection(`users/${user.uid}/shoppingLists`).get()).size).toBe(0);
    expect((await db.collectionGroup('items').get()).size).toBe(0);
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
});
