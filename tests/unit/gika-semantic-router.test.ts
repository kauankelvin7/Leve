import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGikaRouter } from '../../server/gika/router';
import { createGeminiAdapter, type GeminiTransport } from '../../server/gika/gemini';
import { AppError } from '../../server/errors';
import { gikaRequestSchema, type ReadItem } from '../../packages/domain/src/gika';
import type { ReadRange } from '../../server/gika/reads';
import { semanticTurnSchema, type SemanticTurn } from '../../server/gika/semanticTurn';
import type { ModelCall } from '../../server/gika/model';
import { hashValue } from '../../server/hash';
import { createConfirmationSigner } from '../../server/gika/confirmation';

const database = vi.hoisted(() => ({ doc: vi.fn(), collection: vi.fn(), runTransaction: vi.fn(), getAll: vi.fn() }));
vi.mock('../../server/platform/firebase.ts', () => ({ db: database, adminAuth: {} }));
vi.mock('../../server/gika/confirmation.ts', async importOriginal => {
  const actual = await importOriginal<typeof import('../../server/gika/confirmation')>();
  const signer = actual.createConfirmationSigner(crypto.getRandomValues(new Uint8Array(32)));
  return { ...actual, issueConfirmation: (...args: Parameters<typeof actual.issueConfirmation>) => signer.issue(...args),
    issueRecurrenceConfirmation: (...args: Parameters<typeof actual.issueRecurrenceConfirmation>) => signer.issueRecurrenceConfirmation(...args),
    issueRecurrenceChoice: (...args: Parameters<typeof actual.issueRecurrenceChoice>) => signer.issueRecurrenceChoice(...args) };
});

const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const tomorrow = '2026-10-06';
const task: ReadItem = {
  id: 'synthetic-task', title: 'Academia', revision: 4, kind: 'task', status: 'pending', seriesId: null, occurrenceKey: null,
  schedule: { type: 'task', dueDate: context.today, dueTime: '10:00', timeZone: context.timeZone, disambiguation: 'reject' },
};
const create = { name: 'create_task', args: { title: 'ir à academia', dueDate: tomorrow, dueTime: '19:00' } };
const complete = { name: 'complete_task', args: { title: task.title, date: context.today } };
function action(proposal: ModelCall = create): SemanticTurn {
  return semanticTurnSchema.parse({ domainIntent: 'AGENDA_ACTION', certain: true, explicitAction: true, reply: null, proposals: [proposal] });
}
function upstream(turn: unknown) {
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args: turn } }] } }] });
}
function fixture(turn: unknown, items: ReadItem[] = [task], partial = false) {
  const http = vi.fn<GeminiTransport>().mockImplementation(async () => upstream(turn));
  const adapter = createGeminiAdapter(http);
  const repository = {
    authorize: vi.fn().mockResolvedValue(context),
    read: vi.fn().mockImplementation(async (_uid: string, range: ReadRange) => ({ ...range, partial, cached: false, items })),
    recoverMutation: vi.fn().mockResolvedValue(null),
    recoverBatch: vi.fn().mockResolvedValue(null),
    inspectRecurrence: vi.fn().mockResolvedValue({ seriesId: 'synthetic-series', occurrenceKey: context.today,
      seriesHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), futureHash: null, futureCount: 0, futureAllowed: false }),
  };
  const quota = vi.fn();
  const recoveryQuota = vi.fn();
  const app = express();
  app.use((_req, res, next) => { res.locals.identity = { uid: 'synthetic-user' }; res.locals.correlationId = 'synthetic-correlation'; next(); });
  app.use('/gika', createGikaRouter(adapter, repository, quota, recoveryQuota));
  app.use((error: AppError, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status ?? 422).json({ code: error.code }));
  return {
    app, http, adapter, repository, quota, recoveryQuota,
    ask: (text: string, conversation?: { role: 'user' | 'assistant'; text: string }[]) => request(app).post('/gika/respond').send({ requestId: crypto.randomUUID(), text, ...(conversation ? { conversation } : {}) }),
  };
}
function expectUncommitted(body: Record<string, unknown>) {
  for (const field of ['createdTask', 'completedTask', 'updatedTask', 'batchResult', 'recurrenceApplied']) expect(body).not.toHaveProperty(field);
}
afterEach(() => {
  for (const method of Object.values(database)) expect(method).not.toHaveBeenCalled();
  vi.clearAllMocks();
});

// Controlled respond_turn outputs prove routing boundaries, not provider semantic accuracy.
describe('single semantic turn through the real Gemini adapter and router', () => {
  it.each(['feira', 'dentista', 'academia'])('scheduling %s with an automatic notification reaches Gemini and keeps the actual title', async target => {
    const title = `ir pra ${target}`;
    const f = fixture(action({ name: 'create_task', args: { title, dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask(`Poderia agendar para amanhã às 19:00 que eu tenho que ${title}, preciso que me notifique`);
    expect(response.status).toBe(200);
    expect(response.body.createTask).toMatchObject({ title, dueDate: tomorrow, dueTime: '19:00' });
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(response.body.text).not.toContain('Tente agendar');
  });
  it('a complete answer to the scheduling question does not need a repeated creation verb', async () => {
    const f = fixture(action({ name: 'create_task', args: { title: 'Ir a feira', dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask('Ir a feira amanhã às 19:00', [
      { role: 'user', text: 'Preciso agendar algo' },
      { role: 'assistant', text: 'O que você gostaria de agendar?' },
    ]);
    expect(response.status).toBe(200);
    expect(response.body.createTask).toMatchObject({ title: 'Ir a feira', dueDate: tomorrow, dueTime: '19:00' });
    expect(f.http).toHaveBeenCalledTimes(1);
  });
  it.each(['Me lembre de', 'Me avise de', 'Me notifique para'])('%s is a scheduling request, not an unsupported second operation', async prefix => {
    const f = fixture(action({ name: 'create_task', args: { title: 'ir pra feira', dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask(`${prefix} ir pra feira amanhã às 19h`);
    expect(response.status).toBe(200);
    expect(response.body.createTask).toMatchObject({ title: 'ir pra feira', dueDate: tomorrow, dueTime: '19:00' });
  });
  it.each(['19h', '19:00', 'sete da noite', '19 horas'])('automatic notification supports the current time expression %s', async time => {
    const f = fixture(action({ name: 'create_task', args: { title: 'ir pra feira', dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask(`Agende ir pra feira amanhã às ${time} e me notifique`);
    expect(response.status).toBe(200);
    expect(response.body.createTask).toMatchObject({ title: 'ir pra feira', dueDate: tomorrow, dueTime: '19:00' });
  });
  it('asks only the missing time rather than silently creating a task with no requested notification', async () => {
    const f = fixture(action({ name: 'create_task', args: { title: 'ir pra feira', dueDate: tomorrow, dueTime: null } }));
    const response = await f.ask('Agende ir pra feira amanhã e me notifique');
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('createTask');
    expect(response.body.text).toContain('Qual horário');
    expect(response.body.text).not.toContain('Qual tarefa');
  });
  it.each(['sim', 'às 19h'])('clarification history cannot supply missing current task fields: %s', async text => {
    const f = fixture(action({ name: 'create_task', args: { title: 'Ir a feira', dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask(text, [
      { role: 'user', text: 'Agende Ir a feira amanhã' },
      { role: 'assistant', text: 'Qual horário para essa tarefa?' },
    ]);
    expect(response.body).not.toHaveProperty('createTask');
  });
  it.each([
    'Agende Academia amanhã às 19h e me avise 30 minutos antes',
    'Agende Academia amanhã às 19h e me notifique o dia todo',
    'Agende Academia amanhã às 19h mas não me notifique',
    'Agende Academia amanhã às 19h sem notificação',
    'Agende Academia amanhã às 19h e desative as notificações',
    'Agende Academia amanhã às 19h mas não quero receber notificações',
  ])('never silently drops a notification restriction: %s', async text => {
    const f = fixture(action({ name: 'create_task', args: { title: 'Academia', dueDate: tomorrow, dueTime: '19:00' } }));
    const response = await f.ask(text);
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('createTask');
    expect(response.body.text).toMatch(/aviso|notifica|lembrete/i);
    expect(f.http).toHaveBeenCalledTimes(1);
  });
  it('preserves a focused query clarification instead of asking again for an already supplied period', async () => {
    const f = fixture({ domainIntent: 'AGENDA_QUERY', certain: true, explicitAction: false, reply: null,
      proposals: [{ name: 'respond_conversation', args: { text: 'Você quer consultar esta semana ou a próxima?' } }] });
    const response = await f.ask('Mostra a agenda da semana que vem, ou desta, ainda não decidi');
    expect(response.status).toBe(200);
    expect(response.body.text).toBe('Você quer consultar esta semana ou a próxima?');
    expect(response.body.reads).toEqual([]);
    expect(f.repository.read).not.toHaveBeenCalled();
  });
  it.each([
    { text: 'eu quero agendar para amanhã às 7 horas da noite é ir à academia', proposal: create, field: 'createTask', expected: { title: 'ir à academia', dueDate: tomorrow, dueTime: '19:00', timeZone: context.timeZone } },
    { text: 'dá baixa em Academia, acabei ela hoje', proposal: complete, field: 'completeTask', expected: { id: task.id, title: task.title, revision: task.revision, dueDate: context.today } },
    { text: 'essa tarefa Academia agora vai se chamar Treino', proposal: { name: 'update_task', args: { title: task.title, date: context.today, patch: { title: 'Treino' } } }, field: 'updateTask', expected: { id: task.id, revision: task.revision, patch: { title: 'Treino' } } },
    { text: 'amanhã às sete da noite eu quero fazer Academia em vez de hoje', proposal: { name: 'reschedule_task', args: { title: task.title, date: context.today, patch: { dueDate: tomorrow, dueTime: '19:00' } } }, field: 'rescheduleTask', expected: { id: task.id, revision: task.revision, patch: { dueDate: tomorrow, dueTime: '19:00' } } },
  ])('$field routes a synthetic natural-language interpretation without requiring the old command grammar', async ({ text, proposal, field, expected }) => {
    const f = fixture(action(proposal)), response = await f.ask(text);
    expect(response.status).toBe(200);
    expect(response.body[field]).toMatchObject(expected);
    expect(response.body.domainIntent).toBe('AGENDA_ACTION');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.quota).toHaveBeenCalledTimes(1);
    expect(f.repository.read).toHaveBeenCalledTimes(field === 'createTask' ? 0 : 1);
    if (field !== 'createTask') expect(f.repository.read).toHaveBeenCalledWith('synthetic-user', { startDate: context.today, endDate: context.today, timeZone: context.timeZone });
    if (field === 'rescheduleTask') {
      expect(response.body.confirmation.policy).toMatchObject({ kind: 'confirm', reason: 'RESCHEDULE_PREVIEW_REQUIRED' });
      expect(response.body.confirmation.action.task).toEqual(response.body.rescheduleTask);
      expect(response.body.confirmation.token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
      const claims = JSON.parse(Buffer.from(response.body.confirmation.token.split('.')[0], 'base64url').toString('utf8'));
      expect(claims.requestTextHash).toBe(hashValue(text.trim()));
    }
    expectUncommitted(response.body);
  });

  it.each([
    { name: 'get_today', args: {}, startDate: context.today, endDate: context.today },
    { name: 'get_week', args: { date: context.today }, startDate: context.today, endDate: '2026-10-11' },
  ])('$name makes one provider call and reads only the requested civil interval', async ({ name, args, startDate, endDate }) => {
    const f = fixture({ domainIntent: 'AGENDA_QUERY', certain: true, explicitAction: false, reply: null, proposals: [{ name, args }] });
    const response = await f.ask('dá uma olhada no que ficou para hoje');
    expect(response.status).toBe(200);
    expect(response.body.reads).toHaveLength(1);
    expect(response.body.reads[0]).toMatchObject({ startDate, endDate, timeZone: context.timeZone, partial: false });
    expect(f.repository.read).toHaveBeenCalledExactlyOnceWith('synthetic-user', { startDate, endDate, timeZone: context.timeZone });
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.quota).toHaveBeenCalledTimes(1);
    expect(response.body).not.toHaveProperty('createTask');
    expectUncommitted(response.body);
  });

  it.each([
    { status: 'not_found', proposal: { name: 'complete_task', args: { title: 'Acad', date: context.today } }, items: [task], partial: false },
    { status: 'ambiguous', proposal: complete, items: [task, { ...task, id: 'second-synthetic-task' }], partial: false },
    { status: 'partial', proposal: complete, items: [task], partial: true },
    { status: 'partial', proposal: complete, items: Array.from({ length: 50 }, (_, index) => ({ ...task, id: `synthetic-${index}`, title: index === 0 ? task.title : `Outra ${index}` })), partial: false },
  ])('$status target resolution never provides a completion descriptor', async ({ status, proposal, items, partial }) => {
    const f = fixture(action(proposal), items, partial), response = await f.ask('dá baixa em Academia, acabei ela hoje');
    if (status === 'not_found') {
      expect(response.status).toBe(422);
      expect(response.body.code).toBe('GIKA_POLICY');
      expect(f.repository.read).not.toHaveBeenCalled();
      return;
    }
    expect(response.status).toBe(200);
    expect(response.body.completionResolution.status).toBe(status);
    expect(response.body).not.toHaveProperty('completeTask');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.repository.read).toHaveBeenCalledTimes(1);
    expectUncommitted(response.body);
  });

  it('an interpretation of bare sim cannot replace the signed confirmation command', async () => {
    const proposal = { name: 'reschedule_task', args: { title: task.title, date: context.today, patch: { dueDate: tomorrow } } };
    const f = fixture(action(proposal)), response = await f.ask('sim', [{ role: 'user', text: 'Move Academia para amanhã' }, { role: 'assistant', text: 'Confirme para continuar.' }]);
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('GIKA_POLICY');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.repository.read).not.toHaveBeenCalled();
    expectUncommitted(response.body);
  });

  it('account revocation during respond_turn blocks proposal exposure and reads', async () => {
    const f = fixture(action());
    f.http.mockImplementationOnce(async () => {
      f.repository.authorize.mockRejectedValue(new AppError(403, 'FORBIDDEN', 'Conta indisponível.'));
      return upstream(action());
    });
    const response = await f.ask('eu quero agendar para amanhã ir à academia');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(response.body).not.toHaveProperty('createTask');
  });

  it('recovers the committed receipt before any provider call under the recovery-only quota', async () => {
    const recovered = { title: 'Snapshot original', dueDate: context.today, dueTime: null, timeZone: context.timeZone };
    const f = fixture(action());
    f.repository.recoverMutation.mockResolvedValue({ kind: 'create', task: recovered });
    const response = await f.ask('Pedido original');
    expect(response.status).toBe(200);
    expect(response.body.createTask).toEqual(recovered);
    expect(f.http).not.toHaveBeenCalled();
    expect(f.quota).not.toHaveBeenCalled();
    expect(f.recoveryQuota).toHaveBeenCalledExactlyOnceWith('synthetic-user');
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(f.repository.authorize).toHaveBeenCalledTimes(2);
    expect(f.repository.authorize.mock.calls.every(call => call[1] === 'receipt')).toBe(true);
    expectUncommitted(response.body);
  });

  it('a generated claim of success attached to a proposal is rejected without an effect', async () => {
    const f = fixture({ ...action(), reply: 'Pronto, adicionei tudo e já salvei.' });
    const response = await f.ask('eu quero agendar para amanhã ir à academia às dezenove horas');
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('GIKA_MALFORMED_CALL');
    expect(response.body).not.toHaveProperty('createTask');
    expectUncommitted(response.body);
  });

  it('a query or conversation proposing mutation fails before any agenda read', async () => {
    for (const domainIntent of ['AGENDA_QUERY', 'SOCIAL']) {
      const f = fixture({ ...action(), domainIntent });
      const response = await f.ask('O que tenho hoje?');
      expect(response.status).toBe(422);
      expect(response.body.code).toBe('GIKA_MALFORMED_CALL');
      expect(f.http).toHaveBeenCalledTimes(1);
      expect(f.repository.read).not.toHaveBeenCalled();
      expect(response.body).not.toHaveProperty('createTask');
    }
  });

  it.each([undefined, 'occurrence', 'future', 'all'] as const)('semantic recurring completion scope %s keeps choice and confirmation safeguards', async recurrenceScope => {
    const proposal = { name: 'complete_task', args: { title: task.title, date: context.today, ...(recurrenceScope ? { recurrenceScope } : {}) } };
    const target = { ...task, seriesId: 'synthetic-series', occurrenceKey: context.today };
    const f = fixture(action(proposal), [target]);
    const response = await f.ask(recurrenceScope === 'occurrence' ? 'A atividade Academia está pronta desta vez. Registra isso só nesta execução?' : 'Registra a conclusão da Academia na rotina');
    expect(response.status).toBe(200);
    expect(f.repository.inspectRecurrence).toHaveBeenCalledTimes(1);
    if (recurrenceScope === undefined) {
      expect(response.body.recurrenceChoice.options).toEqual(['occurrence']);
      expect(response.body).not.toHaveProperty('recurrenceConfirmation');
    } else if (recurrenceScope === 'occurrence') {
      expect(response.body.recurrenceConfirmation.effect.scope).toBe('occurrence');
      expect(response.body.recurrenceConfirmation.policy.kind).toBe('confirm');
      expect(response.body.recurrenceConfirmation.token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    } else {
      expect(response.body.completionResolution.status).toBe('unsupported');
      expect(response.body).not.toHaveProperty('recurrenceConfirmation');
    }
    expect(response.body).not.toHaveProperty('completeTask');
    expectUncommitted(response.body);
  });

  it('allows a bounded recurrence choice plus its token above 12KiB while retaining the respond cap', async () => {
    const original = {
      requestId: crypto.randomUUID(), text: 'A'.repeat(2000),
      conversation: Array.from({ length: 6 }, (_, index) => ({ role: index % 2 ? 'assistant' as const : 'user' as const, text: 'C'.repeat(1000) })),
    };
    expect(gikaRequestSchema.safeParse(original).success).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(original))).toBeLessThan(12 * 1024);
    const choice = { ...original, scope: 'occurrence', token: `${'T'.repeat(5000)}.${'a'.repeat(64)}` };
    expect(choice.token.length).toBeLessThan(8192);
    expect(choice.token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    expect(Buffer.byteLength(JSON.stringify(choice))).toBeGreaterThan(12 * 1024);
    expect(Buffer.byteLength(JSON.stringify(choice))).toBeLessThan(24 * 1024);
    const signer = createConfirmationSigner(crypto.getRandomValues(new Uint8Array(32)));
    const confirmation = signer.issueRecurrenceConfirmation('synthetic-user', original, {
      operation: 'reschedule', scope: 'occurrence', newSeriesId: null, patch: { dueDate: tomorrow },
      task: { id: task.id, title: task.title, revision: task.revision, dueDate: context.today, dueTime: '10:00', timeZone: context.timeZone },
      recurrence: { seriesId: 'synthetic-series', occurrenceKey: context.today, seriesHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), futureHash: null, futureCount: 0, futureAllowed: false },
    });
    const f = fixture(action());
    f.repository.recoverMutation.mockResolvedValue({ kind: 'recurrence', confirmation });
    const response = await request(f.app).post('/gika/choose-recurrence').send(choice);
    expect(response.status).toBe(200);
    expect(response.body.confirmation).toEqual(confirmation);
    expect(f.repository.recoverMutation).toHaveBeenCalledExactlyOnceWith('synthetic-user', { requestId: original.requestId, text: original.text });
    expect(f.http).not.toHaveBeenCalled();
    expect(f.quota).not.toHaveBeenCalled();
    expect(f.recoveryQuota).toHaveBeenCalledExactlyOnceWith('synthetic-user');

    const oversized = { ...original, conversation: original.conversation.map(turn => ({ ...turn, text: 'á'.repeat(1000) })) };
    expect(gikaRequestSchema.safeParse(oversized).success).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(oversized))).toBeGreaterThan(12 * 1024);
    const rejected = await request(f.app).post('/gika/respond').send(oversized);
    expect(rejected.status).toBe(413);
    expect(rejected.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(f.http).not.toHaveBeenCalled();
    expect(f.quota).not.toHaveBeenCalled();
    expect(f.recoveryQuota).toHaveBeenCalledExactlyOnceWith('synthetic-user');
    expect(f.repository.recoverMutation).toHaveBeenCalledTimes(1);
  });
});
