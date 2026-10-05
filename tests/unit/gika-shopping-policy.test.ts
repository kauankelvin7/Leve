import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { semanticTurnSchema } from '../../server/gika/semanticTurn';
import { createGeminiAdapter, geminiPayload, type GeminiTransport } from '../../server/gika/gemini';
import { createGikaRouter } from '../../server/gika/router';
import { AppError } from '../../server/errors';
import { createShoppingListDescriptorSchema, createdShoppingListSchema, shoppingListEnvelope, shoppingListsResultSchema } from '../../packages/domain/src/gikaShopping';
import { gikaInterpretationSchema, toolCallSchema } from '../../packages/domain/src/gika';
import { hashValue } from '../../server/hash';
import { classifyGikaAction, type GikaPolicyFacts } from '../../server/gika/actionPolicy';
import type { ModelAdapter } from '../../server/gika/model';

const database = vi.hoisted(() => ({ doc: vi.fn(), collection: vi.fn(), runTransaction: vi.fn(), getAll: vi.fn() }));
vi.mock('../../server/platform/firebase.ts', () => ({ db: database, adminAuth: {} }));
const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const create = { name: 'create_shopping_list', args: { title: 'Mercado da semana' } };
const read = { name: 'get_shopping_lists', args: {} };
const list = { id: 'synthetic-list', title: 'Mercado da semana', listKind: 'regular' as const, revision: 3, itemCount: 4, pendingItemCount: 2 };
const lists = { items: [list], partial: false, cached: false };
function turn(proposals: unknown[], domainIntent = 'AGENDA_ACTION', explicitAction = true) {
  return { domainIntent, certain: true, explicitAction, reply: null, proposals };
}
function upstream(value: unknown) {
  return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'respond_turn', args: value } }] } }] });
}
function fixture(value: unknown, result: unknown = lists, legacy?: ModelAdapter) {
  const http = vi.fn<GeminiTransport>().mockImplementation(async () => upstream(value));
  const repository = {
    authorize: vi.fn().mockResolvedValue(context),
    recoverMutation: vi.fn().mockResolvedValue(null),
    recoverBatch: vi.fn().mockResolvedValue(null),
    read: vi.fn(),
    readShoppingLists: vi.fn().mockResolvedValue(result),
  };
  const quota = vi.fn();
  const app = express();
  app.use((_req, res, next) => { res.locals.identity = { uid: 'synthetic-user' }; res.locals.correlationId = 'synthetic-shopping-correlation'; next(); });
  app.use('/gika', createGikaRouter(legacy ?? createGeminiAdapter(http), repository, quota));
  app.use((error: AppError, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status ?? 422).json({ code: error.code }));
  return { http, repository, quota, ask: (text: string) => request(app).post('/gika/respond').send({ requestId: crypto.randomUUID(), text }) };
}
function expectNoTaskOrAck(body: Record<string, unknown>) {
  expect(body.reads ?? []).toEqual([]);
  for (const key of ['createTask', 'createdTask', 'completeTask', 'completedTask', 'updateTask', 'updatedTask', 'rescheduleTask', 'confirmation', 'batchResult', 'createdShoppingList']) expect(body).not.toHaveProperty(key);
}
afterEach(() => {
  for (const method of Object.values(database)) expect(method).not.toHaveBeenCalled();
  vi.clearAllMocks();
});

describe('Gika shopping list contract', () => {
  it.each([
    { domainIntent: 'AGENDA_ACTION', explicitAction: true, proposal: { name: 'create_shopping_list', args: { title: 'Mercado da semana' } } },
    { domainIntent: 'AGENDA_QUERY', explicitAction: false, proposal: { name: 'get_shopping_lists', args: {} } },
  ])('registers the closed $proposal.name proposal in the semantic turn', ({ domainIntent, explicitAction, proposal }) => {
    expect(semanticTurnSchema.safeParse({ domainIntent, certain: true, explicitAction, reply: null, proposals: [proposal] }).success).toBe(true);
  });

  it('keeps list creation separate from task fields, identities and command authority', () => {
    expect(createShoppingListDescriptorSchema.parse({ title: ' Mercado da semana ' })).toEqual(create.args);
    expect(toolCallSchema.safeParse(create).success).toBe(true);
    expect(toolCallSchema.safeParse(read).success).toBe(true);
    for (const field of ['id', 'uid', 'entityId', 'operationId', 'expectedRevision', 'dueDate', 'listKind', 'cycleKey', 'items']) {
      const descriptor = { ...create.args, [field]: 'synthetic' };
      expect(createShoppingListDescriptorSchema.safeParse(descriptor).success).toBe(false);
      expect(toolCallSchema.safeParse({ ...create, args: descriptor }).success).toBe(false);
    }
    for (const title of ['', '   ', 'T'.repeat(101)]) expect(createShoppingListDescriptorSchema.safeParse({ title }).success).toBe(false);
    expect(toolCallSchema.safeParse({ ...read, args: { uid: 'synthetic' } }).success).toBe(false);
  });

  it('advertises closed shopping arguments inside respond_turn and legacy action declarations', () => {
    const creationArgs = { type: 'object', additionalProperties: false, properties: { title: { type: 'string', minLength: 1, maxLength: 100 } }, required: ['title'] };
    const readArgs = { type: 'object', additionalProperties: false, properties: {} };
    type ProposalSchema = { additionalProperties: boolean; required: string[]; properties: { name: { enum: string[] }; args: unknown } };
    const semantic = geminiPayload({ text: 'synthetic-shopping-input', context, turnOnly: true });
    const declaration = semantic.tools[0]!.functionDeclarations[0]!;
    expect(declaration.name).toBe('respond_turn');
    const envelope = declaration.parametersJsonSchema as { properties: { proposals: { items: { anyOf: ProposalSchema[] } } } };
    const proposals = envelope.properties.proposals.items.anyOf;
    for (const [name, expectedArgs] of [['create_shopping_list', creationArgs], ['get_shopping_lists', readArgs]] as const) {
      const proposal = proposals.find(row => row.properties.name.enum.includes(name));
      expect(proposal).toMatchObject({ additionalProperties: false, required: ['name', 'args'] });
      expect(proposal?.properties.args).toEqual(expectedArgs);
      const legacy = geminiPayload({ text: 'synthetic-shopping-input', context }).tools[0]!.functionDeclarations.find(tool => tool.name === name);
      expect(legacy?.parametersJsonSchema).toEqual(expectedArgs);
    }
  });

  it('the legacy query declarations include only the closed shopping read and exclude list creation', () => {
    const declarations = geminiPayload({ text: 'synthetic-shopping-input', context, agendaIntent: 'AGENDA_QUERY' }).tools[0]!.functionDeclarations;
    expect(declarations.map(tool => tool.name)).toContain('get_shopping_lists');
    expect(declarations.map(tool => tool.name)).not.toContain('create_shopping_list');
    expect(declarations.find(tool => tool.name === 'get_shopping_lists')?.parametersJsonSchema).toEqual({ type: 'object', additionalProperties: false, properties: {} });
  });

  it('a created-list acknowledgement requires the stable identity, revision 1 and real command result', () => {
    const ack = { title: create.args.title, id: list.id, revision: 1, result: 'applied' };
    expect(createdShoppingListSchema.safeParse(ack).success).toBe(true);
    expect(createdShoppingListSchema.safeParse({ ...ack, result: 'alreadyApplied' }).success).toBe(true);
    for (const value of [{ ...ack, revision: 2 }, { ...ack, result: 'queued' }, { ...ack, id: '' }, { ...ack, uid: 'synthetic' }]) expect(createdShoppingListSchema.safeParse(value).success).toBe(false);
  });

  it('uses the existing shoppingList.create command with software identity and the original request hash', async () => {
    const original = { requestId: crypto.randomUUID(), text: '  Preciso de uma lista pro mercado chamada Mercado da semana  ' };
    const envelope = await shoppingListEnvelope(create.args, original);
    expect(envelope).toMatchObject({
      command: 'shoppingList.create', operationId: original.requestId, entityId: original.requestId, expectedRevision: 0,
      payload: { title: create.args.title, listKind: 'regular', cycleKey: null },
      gikaShopping: { requestTextHash: hashValue(original.text.trim()) },
    });
    expect(await shoppingListEnvelope(create.args, original)).toEqual(envelope);
    expect(envelope).not.toHaveProperty('gika');
  });

  it('projects bounded list summaries with honest partial results and coherent counts', () => {
    expect(shoppingListsResultSchema.parse(lists)).toEqual(lists);
    expect(shoppingListsResultSchema.safeParse({ ...lists, partial: true }).success).toBe(true);
    expect(shoppingListsResultSchema.safeParse({ items: [], partial: false, cached: false }).success).toBe(true);
    for (const listKind of ['regular', 'template', 'cycle']) expect(shoppingListsResultSchema.safeParse({ ...lists, items: [{ ...list, listKind }] }).success).toBe(true);
    for (const value of [
      { ...lists, cached: true },
      { ...lists, items: [{ ...list, itemCount: -1 }] },
      { ...lists, items: [{ ...list, pendingItemCount: 5 }] },
      { ...lists, items: [{ ...list, pendingItemCount: 0.5 }] },
      { ...lists, items: [{ ...list, uid: 'synthetic' }] },
      { ...lists, items: [{ ...list, listKind: undefined }] },
      { ...lists, items: [{ ...list, listKind: 'unsupported' }] },
      { ...lists, items: [list, list] },
      { ...lists, items: Array.from({ length: 51 }, (_, index) => ({ ...list, id: `synthetic-${index}` })) },
    ]) expect(shoppingListsResultSchema.safeParse(value).success).toBe(false);
  });

  it('never mixes a shopping result or descriptor with a task descriptor', () => {
    const task = { title: 'Academia', dueDate: null, dueTime: null, timeZone: context.timeZone };
    const base = { text: 'Confira sua lista.', simulated: false, reads: [] };
    expect(gikaInterpretationSchema.safeParse({ ...base, createShoppingList: create.args }).success).toBe(true);
    expect(gikaInterpretationSchema.safeParse({ ...base, shoppingLists: lists }).success).toBe(true);
    expect(gikaInterpretationSchema.safeParse({ ...base, createShoppingList: create.args, createTask: task }).success).toBe(false);
    expect(gikaInterpretationSchema.safeParse({ ...base, shoppingLists: lists, createTask: task }).success).toBe(false);
    expect(gikaInterpretationSchema.safeParse({ ...base, shoppingLists: lists, createShoppingList: create.args }).success).toBe(false);
  });

  it('rejects uncertain, nonexplicit, conversational and query attempts to create a list', () => {
    for (const value of [
      turn([create], 'AGENDA_ACTION', false),
      { ...turn([create]), certain: false },
      turn([create], 'AGENDA_QUERY', true),
      { ...turn([create], 'SOCIAL'), reply: 'Oi!' },
      turn([create], 'OUT_OF_SCOPE'),
    ]) expect(semanticTurnSchema.safeParse(value).success).toBe(false);
  });

  it('the software action policy refuses shopping recurrence and cross-domain targets', () => {
    const facts: GikaPolicyFacts = {
      action: 'create_shopping_list', effect: 'create', cardinality: 'new', entity: 'shopping_list', state: 'new',
      recurring: false, recurrenceScope: 'none', fields: ['title'], validation: 'valid', authorization: 'verified', completeness: 'complete', noOp: false,
    };
    expect(classifyGikaAction(facts)).toEqual({ kind: 'allow' });
    for (const recurrenceScope of ['unspecified', 'occurrence', 'future']) {
      expect(classifyGikaAction({ ...facts, recurring: true, recurrenceScope, recurrenceInspected: true, futureAllowed: true })).toEqual({ kind: 'deny', reason: 'RECURRENCE_NOT_SUPPORTED' });
    }
    expect(classifyGikaAction({ ...facts, entity: 'task' })).toEqual({ kind: 'deny', reason: 'UNSUPPORTED_TARGET' });
    expect(classifyGikaAction({ ...facts, action: 'create_task', fields: ['title', 'dueDate', 'dueTime'] })).toEqual({ kind: 'deny', reason: 'UNSUPPORTED_TARGET' });
  });

  it('shopping tools remain single and exclusive even beside another read', () => {
    for (const proposals of [[create, read], [create, create], [read, read], [read, { name: 'get_today', args: {} }]]) {
      expect(semanticTurnSchema.safeParse(turn(proposals, proposals[0] === read ? 'AGENDA_QUERY' : 'AGENDA_ACTION', proposals[0] !== read)).success).toBe(false);
    }
  });

  it.each(['add_shopping_item', 'check_shopping_item', 'delete_shopping_list'])('unsupported %s cannot become a list or task proposal', name => {
    expect(semanticTurnSchema.safeParse(turn([{ name, args: { title: 'Arroz' } }])).success).toBe(false);
  });
});

// Controlled Gemini outputs validate software boundaries, not live semantic accuracy.
describe('shopping lists through the real adapter and router', () => {
  it('a legacy classification cannot authorize list creation from a narration', async () => {
    const legacy = {
      classify: vi.fn().mockResolvedValue({ intent: 'AGENDA_ACTION', certain: true, reply: null }),
      interpret: vi.fn().mockResolvedValue([create]),
    };
    const f = fixture(null, lists, legacy), response = await f.ask('Lista Mercado');
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('GIKA_POLICY');
    expect(legacy.classify).toHaveBeenCalledTimes(1);
    expect(legacy.interpret).toHaveBeenCalledTimes(1);
    expect(response.body).not.toHaveProperty('createShoppingList');
    expect(f.repository.readShoppingLists).not.toHaveBeenCalled();
    expect(f.repository.read).not.toHaveBeenCalled();
    expectNoTaskOrAck(response.body);
  });

  it('creates only a list descriptor with one model call and no database write', async () => {
    const f = fixture(turn([create])), response = await f.ask('Preciso de uma lista pro mercado chamada Mercado da semana');
    expect(response.status).toBe(200);
    expect(response.body.createShoppingList).toEqual(create.args);
    expect(response.body.domainIntent).toBe('AGENDA_ACTION');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.quota).toHaveBeenCalledTimes(1);
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(f.repository.readShoppingLists).not.toHaveBeenCalled();
    expectNoTaskOrAck(response.body);
  });

  it.each([false, true])('reads only shopping summaries with partial=%s and one model call', async partial => {
    const result = { ...lists, partial, items: [list, { ...list, id: 'synthetic-template', listKind: 'template' }, { ...list, id: 'synthetic-cycle', listKind: 'cycle' }] };
    const f = fixture(turn([read], 'AGENDA_QUERY', false), result), response = await f.ask('Quais listas eu tenho para ir ao mercado?');
    expect(response.status).toBe(200);
    expect(response.body.shoppingLists).toEqual(result);
    expect(f.repository.readShoppingLists).toHaveBeenCalledExactlyOnceWith('synthetic-user');
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.quota).toHaveBeenCalledTimes(1);
    expect(response.body).not.toHaveProperty('createShoppingList');
    expectNoTaskOrAck(response.body);
  });

  it('an empty shopping result stays an empty list result without an agenda fallback', async () => {
    const empty = { items: [], partial: false, cached: false };
    const f = fixture(turn([read], 'AGENDA_QUERY', false), empty), response = await f.ask('Mostre minhas listas de compras');
    expect(response.status).toBe(200);
    expect(response.body.shoppingLists).toEqual(empty);
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(f.repository.readShoppingLists).toHaveBeenCalledTimes(1);
    expectNoTaskOrAck(response.body);
  });

  it.each(['SOCIAL', 'GIKA_META', 'ORGANIZATION_CONVERSATION', 'OUT_OF_SCOPE'])('%s conversation never reads shopping lists or proposes a task', async domainIntent => {
    const value = { ...turn([], domainIntent, false), reply: domainIntent === 'OUT_OF_SCOPE' ? null : 'Posso ajudar com suas listas e agenda.' };
    const f = fixture(value), response = await f.ask('Me ajude com compras');
    expect(response.status).toBe(200);
    expect(response.body.domainIntent).toBe(domainIntent);
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.repository.readShoppingLists).not.toHaveBeenCalled();
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(response.body).not.toHaveProperty('createShoppingList');
    expect(response.body).not.toHaveProperty('shoppingLists');
    expectNoTaskOrAck(response.body);
  });

  it('revocation while the model responds blocks both list descriptors and reads', async () => {
    const f = fixture(turn([create]));
    f.http.mockImplementationOnce(async () => {
      f.repository.authorize.mockRejectedValue(new AppError(403, 'FORBIDDEN', 'Conta indisponível.'));
      return upstream(turn([create]));
    });
    const response = await f.ask('Crie a lista Mercado da semana');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body).not.toHaveProperty('createShoppingList');
    expect(f.repository.readShoppingLists).not.toHaveBeenCalled();
    expect(f.repository.read).not.toHaveBeenCalled();
    expectNoTaskOrAck(response.body);
  });

  it('revocation while reading shopping lists prevents private summaries from reaching the response', async () => {
    const f = fixture(turn([read], 'AGENDA_QUERY', false));
    f.repository.readShoppingLists.mockImplementationOnce(async () => {
      f.repository.authorize.mockRejectedValue(new AppError(403, 'FORBIDDEN', 'Conta indisponível.'));
      return lists;
    });
    const response = await f.ask('Mostre minhas listas de compras');
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
    expect(response.body).not.toHaveProperty('shoppingLists');
    expectNoTaskOrAck(response.body);
  });

  it.each([
    { ...lists, cached: true },
    { ...lists, items: [{ ...list, pendingItemCount: 5 }] },
    { ...lists, items: [{ ...list, uid: 'synthetic' }] },
  ])('invalid shopping summaries fail closed without returning data: %j', async invalid => {
    const f = fixture(turn([read], 'AGENDA_QUERY', false), invalid), response = await f.ask('Mostre minhas listas de compras');
    expect(response.status).toBe(503);
    expect(response.body).not.toHaveProperty('shoppingLists');
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.repository.read).not.toHaveBeenCalled();
    expectNoTaskOrAck(response.body);
  });

  it('missing shopping read support fails closed without falling back to task reads', async () => {
    const f = fixture(turn([read], 'AGENDA_QUERY', false));
    Reflect.deleteProperty(f.repository, 'readShoppingLists');
    const response = await f.ask('Mostre minhas listas de compras');
    expect(response.status).toBe(503);
    expect(response.body).not.toHaveProperty('shoppingLists');
    expect(f.repository.read).not.toHaveBeenCalled();
    expectNoTaskOrAck(response.body);
  });

  it.each([
    turn([create], 'AGENDA_ACTION', false),
    turn([create, read]),
    turn([read, { name: 'get_today', args: {} }], 'AGENDA_QUERY', false),
    turn([{ name: 'add_shopping_item', args: { name: 'Arroz' } }]),
  ])('invalid proposals are rejected before either shopping or task reads: %j', async invalid => {
    const f = fixture(invalid), response = await f.ask('Me ajude com compras');
    expect(response.status).toBe(422);
    expect(response.body.code).toBe('GIKA_MALFORMED_CALL');
    expect(f.repository.readShoppingLists).not.toHaveBeenCalled();
    expect(f.repository.read).not.toHaveBeenCalled();
    expect(response.body).not.toHaveProperty('createShoppingList');
    expectNoTaskOrAck(response.body);
  });
});
