import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ user: { uid: 'account-a' } as { uid: string } | null, request: vi.fn(), command: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return fixture.user; } } }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: fixture.request, sendCommand: fixture.command, ApiError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
import { createApiAdapter } from '../../apps/web/src/features/gika/apiAdapter';
import { executeCreateShoppingList } from '../../apps/web/src/features/gika/shoppingBridge';
import { shoppingListEnvelope } from '../../packages/domain/src/gikaShopping';
import { conversationContext } from '../../apps/web/src/features/gika/conversationContext';
import { readFileSync } from 'node:fs';
const input = { requestId: 'c8f8a6b4-038a-4cc4-b2bd-c0b2751c5269', text: 'Crie uma lista de compras com o nome Jantar' };
const creation = { text: 'Preparando a lista…', simulated: false, reads: [], createShoppingList: { title: 'Jantar' } };
const ack = (command: { operationId: string; entityId: string }) => ({ operationId: command.operationId, entityId: command.entityId, revision: 1, serverTime: '2026-10-05T12:00:00Z', result: 'applied' });
beforeEach(() => { fixture.user = { uid: 'account-a' }; fixture.request.mockReset(); fixture.command.mockReset(); });
describe('Gika shopping lists use the existing authenticated command and checked receipt', () => {
  it('creates the requested list instead of asking a generic agenda question or creating a task', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => ack(command));
    const result = await createApiAdapter()(input, new AbortController().signal);
    expect(result).toMatchObject({ text: 'Lista de compras criada.', createdShoppingList: { title: 'Jantar', id: input.requestId, revision: 1, result: 'applied' } });
    expect(fixture.command).toHaveBeenCalledTimes(1);
    const [command, options] = fixture.command.mock.calls[0]!;
    expect(command).toMatchObject({ command: 'shoppingList.create', operationId: input.requestId, entityId: input.requestId, expectedRevision: 0, payload: { title: 'Jantar', listKind: 'regular', cycleKey: null }, gikaShopping: { requestTextHash: expect.stringMatching(/^[a-f0-9]{64}$/) } });
    expect(options).toMatchObject({ expectedUid: 'account-a', queueOnNetworkError: false });
    expect(result).not.toHaveProperty('createdTask');
  });
  it('announces creation only after a validated command acknowledgement', async () => {
    fixture.request.mockResolvedValue(creation);
    let finish!: (value: unknown) => void;
    fixture.command.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let settled = false;
    const result = createApiAdapter()(input, new AbortController().signal).then(value => { settled = true; return value; });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(settled).toBe(false);
    finish(ack(fixture.command.mock.calls[0]![0]));
    await expect(result).resolves.toHaveProperty('createdShoppingList');
  });
  it.each([null, { uid: 'account-b' }])('account change %j rejects before dispatch and discards an old acknowledgement', async user => {
    fixture.request.mockImplementation(async () => { fixture.user = user; return creation; });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fixture.command).not.toHaveBeenCalled();
    fixture.user = { uid: 'account-a' }; fixture.request.mockResolvedValue(creation);
    fixture.command.mockImplementation(async command => { fixture.user = user; return ack(command); });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('manual retry after a lost ack uses the same envelope; new explicit intent uses another ID', async () => {
    fixture.request.mockResolvedValue(creation);
    fixture.command.mockRejectedValueOnce(new Error('lost ack')).mockImplementation(async command => ({ ...ack(command), result: 'alreadyApplied' }));
    const adapter = createApiAdapter();
    await expect(adapter(input, new AbortController().signal)).rejects.toThrow('lost ack');
    await expect(adapter(input, new AbortController().signal)).resolves.toMatchObject({ createdShoppingList: { result: 'alreadyApplied' } });
    expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
    await adapter({ ...input, requestId: crypto.randomUUID() }, new AbortController().signal);
    expect(fixture.command.mock.calls[2]![0].entityId).not.toBe(input.requestId);
  });
  it('concurrent adapters preserve identical original envelopes', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => ack(command));
    await Promise.all([createApiAdapter()(input, new AbortController().signal), createApiAdapter()(input, new AbortController().signal)]);
    expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
  });
  it.each([
    { operationId: crypto.randomUUID() }, { entityId: 'other' }, { revision: 2 }, { result: 'queued' }, { serverTime: 'invalid' },
  ])('invalid acknowledgement %j never becomes success', async extra => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => ({ ...ack(command), ...extra }));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
  });
  it.each([{ title: '' }, { title: 'x'.repeat(101) }, { title: 'Jantar', uid: 'other' }, { title: 'Jantar', items: ['arroz'] }, { title: 'Jantar', listKind: 'template' }])('unknown or excessive descriptor %j never dispatches', async createShoppingList => {
    fixture.request.mockResolvedValue({ ...creation, createShoppingList });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('a narrative, forged result, or mixed read/effect cannot confirm creation', async () => {
    fixture.request.mockResolvedValue({ text: 'Criei a lista Jantar.', simulated: false, reads: [] });
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.not.toHaveProperty('createdShoppingList');
    fixture.request.mockResolvedValue({ text: 'Criei a lista.', simulated: false, reads: [], createdShoppingList: { title: 'Jantar', id: input.requestId, revision: 1, result: 'applied' } });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    fixture.request.mockResolvedValue({ ...creation, shoppingLists: { items: [], cached: false, partial: false } });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('bounded list reads and focused unsupported-operation clarification do not dispatch commands', async () => {
    const shoppingLists = { items: [{ id: 'jantar', title: 'Jantar', listKind: 'regular', revision: 2, itemCount: 3, pendingItemCount: 2 }], partial: false, cached: false };
    fixture.request.mockResolvedValue({ text: 'Você tem uma lista de compras ativa.', simulated: false, reads: [], shoppingLists });
    await expect(createApiAdapter()({ ...input, text: 'Quais listas eu tenho?' }, new AbortController().signal)).resolves.toHaveProperty('shoppingLists', shoppingLists);
    const clarification = { text: 'Posso criar e consultar suas listas. Para adicionar arroz à Jantar, abra a lista em Compras.', intent: 'agenda_action', simulated: false, reads: [] };
    fixture.request.mockResolvedValue(clarification);
    await expect(createApiAdapter()({ ...input, text: 'Põe arroz nessa lista' }, new AbortController().signal)).resolves.toEqual(clarification);
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('canonical bridge rejects changed target/payload, metadata mixing, and missing metadata', async () => {
    const descriptor = { title: 'Jantar' };
    const command = await shoppingListEnvelope(descriptor, input);
    for (const changed of [
      { ...command, entityId: 'different' }, { ...command, command: 'shoppingList.trash' }, { ...command, expectedRevision: 1 },
      { ...command, gikaShopping: undefined }, { ...command, gika: { requestTextHash: 'a'.repeat(64) } },
      { ...command, payload: { title: 'Almoço', listKind: 'regular', cycleKey: null } },
      { ...command, payload: { title: 'Jantar', listKind: 'template', cycleKey: null } },
      { ...command, clientCreatedAt: '2026-10-05T12:00:00Z' },
    ]) await expect(executeCreateShoppingList(descriptor, changed, 'account-a', new AbortController().signal)).rejects.toThrow();
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('abort prevents dispatch and invalidates acknowledgement even if transport ignores it', async () => {
    const command = await shoppingListEnvelope({ title: 'Jantar' }, input);
    const controller = new AbortController(); controller.abort();
    await expect(executeCreateShoppingList({ title: 'Jantar' }, command, 'account-a', controller.signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fixture.command).not.toHaveBeenCalled();
    const active = new AbortController(); fixture.command.mockImplementation(async command => { active.abort(); return ack(command); });
    await expect(executeCreateShoppingList({ title: 'Jantar' }, command, 'account-a', active.signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('receipt mismatch recovers only once and still requires the correct acknowledgement', async () => {
    const { ApiError } = await import('../../apps/web/src/platform/api');
    fixture.request.mockResolvedValueOnce({ ...creation, createShoppingList: { title: 'Other proposal' } }).mockResolvedValueOnce(creation);
    fixture.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Mismatch')).mockImplementation(async command => ({ ...ack(command), result: 'alreadyApplied' }));
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.toMatchObject({ createdShoppingList: { title: 'Jantar', result: 'alreadyApplied' } });
    expect(fixture.request).toHaveBeenCalledTimes(2); expect(fixture.command).toHaveBeenCalledTimes(2);
    fixture.request.mockClear(); fixture.request.mockResolvedValue(creation); fixture.command.mockRejectedValue(new ApiError(409, 'OPERATION_MISMATCH', 'Mismatch'));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'OPERATION_MISMATCH' });
    expect(fixture.request).toHaveBeenCalledTimes(2);
  });
  it('context keeps list names and bounded counts, never IDs, receipts or command authority', () => {
    const context = conversationContext([
      { id: 'u', role: 'user', text: input.text },
      { id: 'a', role: 'assistant', text: 'Lista de compras criada.', createdShoppingList: { title: 'Jantar', id: 'private-id', revision: 1, result: 'applied' } },
      { id: 'u2', role: 'user', text: 'Quais listas eu tenho?' },
      { id: 'a2', role: 'assistant', text: 'Suas listas.', shoppingLists: { cached: false, partial: false, items: Array.from({ length: 10 }, (_, i) => ({ id: `private-${i}`, title: `Lista ${i}`, listKind: 'regular' as const, revision: 2, itemCount: i, pendingItemCount: i })) } },
    ], { requestId: crypto.randomUUID(), text: 'E essa lista?' });
    const serialized = JSON.stringify(context);
    expect(serialized).toContain('shopping_list_created'); expect(serialized).toContain('Jantar'); expect(serialized).toContain('Lista 4');
    expect(serialized).not.toMatch(/private|revision|requestTextHash|Lista 5/);
  });
  it('shopping bridge has no direct Firestore writer or provider call', () => {
    const source = readFileSync('apps/web/src/features/gika/shoppingBridge.ts', 'utf8');
    expect(source).toContain('sendCommand(parsed');
    expect(source).not.toMatch(/firebase-admin|firebase\/firestore|apiRequest|gika\/respond|\b(?:setDoc|addDoc|updateDoc|deleteDoc|runTransaction)\s*\(/);
  });
});
