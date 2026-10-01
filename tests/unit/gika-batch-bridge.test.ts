import { beforeEach, describe, expect, it, vi } from 'vitest';
import { batchConfirmationSchema, batchOperationId, type BatchConfirmation } from '../../packages/domain/src/gikaBatch';
const state = vi.hoisted(() => ({ auth: { currentUser: { uid: 'account-a' } as { uid: string } | null }, request: vi.fn(), command: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: state.auth }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: state.request, sendCommand: state.command, ApiError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
import { ApiError } from '../../apps/web/src/platform/api';
import { confirmGikaBatch } from '../../apps/web/src/features/gika/batchBridge';
const request = { requestId: 'f3a2ab71-21cf-40a7-842f-0e3aeff1fe8b', text: 'Conclui as tarefas de hoje' };
const signal = () => new AbortController().signal;
async function confirmation(action: 'complete' | 'reschedule' = 'complete'): Promise<BatchConfirmation> {
  return batchConfirmationSchema.parse({ plan: { action, sourceDate: '2026-10-01', items: await Promise.all([0, 1].map(async index => ({ id: `target-${index}`, title: `Tarefa ${index}`, operationId: await batchOperationId('account-a', request.requestId, index), revision: 1, timeZone: 'America/Sao_Paulo', before: { dueDate: '2026-10-01', dueTime: index ? '19:00' : null }, patch: action === 'complete' ? { status: 'completed' } : { dueDate: '2026-10-02' }, scope: 'none' }))) }, token: `test.${'0'.repeat(64)}` });
}
const ack = (command: { operationId: string; entityId: string; expectedRevision: number }) => ({ operationId: command.operationId, entityId: command.entityId, revision: command.expectedRevision + 1, result: 'applied', serverTime: '2026-10-01T12:00:00.000Z' });
beforeEach(() => { state.auth.currentUser = { uid: 'account-a' }; state.request.mockReset(); state.command.mockReset(); state.command.mockImplementation(async command => ack(command)); });
describe('M5-T4 deterministic batch bridge / E77..E100', () => {
  it.each(['complete', 'reschedule'] as const)('bounded %s dispatches only existing commands sequentially and returns real ack aggregate', async action => {
    const value = await confirmation(action);
    const result = await confirmGikaBatch(value, request, 'account-a', signal());
    expect(result).toMatchObject({ requested: 2, applied: 2, alreadyApplied: 0, conflicts: 0, failed: 0, pending: 0, unknown: 0 });
    expect(state.command).toHaveBeenCalledTimes(2);
    for (const [index, args] of state.command.mock.calls.entries()) {
      expect(args[0]).toMatchObject({ operationId: value.plan.items[index]!.operationId, entityId: `target-${index}`, command: action === 'complete' ? 'activity.setStatus' : 'activity.update', expectedRevision: 1, payload: action === 'complete' ? { status: 'completed' } : { dueDate: '2026-10-02' } });
      expect(args[1]).toMatchObject({ expectedUid: 'account-a', queueOnNetworkError: false });
    }
    expect(state.request).not.toHaveBeenCalled();
  });
  it('waits for actual ack before proceeding to the second item or returning any success', async () => {
    let release!: (value: unknown) => void;
    state.command.mockImplementationOnce(command => new Promise(resolve => { release = value => resolve(value ?? ack(command)); }));
    let completed = false;
    const value = await confirmation(), pending = confirmGikaBatch(value, request, 'account-a', signal()).then(result => { completed = true; return result; });
    await vi.waitFor(() => expect(state.command).toHaveBeenCalledTimes(1));
    expect(completed).toBe(false); release(null);
    expect((await pending).applied).toBe(2);
  });
  it('retry/lost ack uses identical commands and recovers alreadyApplied without any model call', async () => {
    const value = await confirmation();
    state.command.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Conexão indisponível.'));
    const lost = await confirmGikaBatch(value, request, 'account-a', signal());
    expect(lost).toMatchObject({ applied: 0, unknown: 1, pending: 1 });
    state.command.mockImplementationOnce(async command => ({ ...ack(command), result: 'alreadyApplied' }));
    expect(await confirmGikaBatch(value, request, 'account-a', signal())).toMatchObject({ alreadyApplied: 1, applied: 1, unknown: 0 });
    expect(state.command.mock.calls[0]![0]).toEqual(state.command.mock.calls[1]![0]); expect(state.request).not.toHaveBeenCalled();
  });
  it('partial commit is itemized; stale item stops remaining commands without revision refresh', async () => {
    state.command.mockImplementationOnce(async command => ack(command)).mockRejectedValueOnce(new ApiError(409, 'REVISION_CONFLICT', 'Mudou.'));
    const result = await confirmGikaBatch(await confirmation(), request, 'account-a', signal());
    expect(result).toMatchObject({ applied: 1, conflicts: 1, failed: 0 });
    expect(result.items.map(item => item.status)).toEqual(['applied', 'conflict']); expect(state.command).toHaveBeenCalledTimes(2);
  });
  it('initial stale revision never reports aggregate success', async () => {
    state.command.mockRejectedValueOnce(new ApiError(409, 'REVISION_CONFLICT', 'Mudou.'));
    expect(await confirmGikaBatch(await confirmation(), request, 'account-a', signal())).toMatchObject({ applied: 0, conflicts: 1, pending: 1 });
    expect(state.command).toHaveBeenCalledTimes(1);
  });
  it.each([0, 503])('transport/status%s failure may follow commit and remains unknown, never false failed', async status => {
    state.command.mockRejectedValueOnce(new ApiError(status, status ? 'SERVICE_UNAVAILABLE' : 'NETWORK_ERROR', 'Falha.'));
    expect(await confirmGikaBatch(await confirmation(), request, 'account-a', signal())).toMatchObject({ failed: 0, unknown: 1, pending: 1 });
  });
  it('definitive validation/precommit error is failed without attempting brothers', async () => {
    state.command.mockRejectedValueOnce(new ApiError(422, 'REFERENCE_UNAVAILABLE', 'Referência indisponível.'));
    expect(await confirmGikaBatch(await confirmation(), request, 'account-a', signal())).toMatchObject({ failed: 1, unknown: 0, pending: 1 });
  });
  it.each(['id', 'revision', 'operationId', 'malformed'])('invalid ack %s stops and never confirms', async field => {
    state.command.mockImplementationOnce(async command => field === 'malformed' ? { text: 'Tudo pronto' } : { ...ack(command), [field === 'id' ? 'entityId' : field]: field === 'revision' ? 99 : 'neighbor' });
    expect(await confirmGikaBatch(await confirmation(), request, 'account-a', signal())).toMatchObject({ applied: 0, unknown: 1, pending: 1 });
  });
  it('model/client chosen child operation identity is refused before transport', async () => {
    const value = await confirmation(); value.plan.items[0]!.operationId = crypto.randomUUID();
    await expect(confirmGikaBatch(value, request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_INVALID' });
    expect(state.command).not.toHaveBeenCalled();
  });
  it.each([null, { uid: 'account-b' }])('logout/account change before execution denies all transports %j', async user => {
    const value = await confirmation(); state.auth.currentUser = user;
    await expect(confirmGikaBatch(value, request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(state.command).not.toHaveBeenCalled(); expect(state.request).not.toHaveBeenCalled();
  });
  it.each([null, { uid: 'account-b' }])('logout/account change during ack never sends next command %j', async user => {
    state.command.mockImplementationOnce(async command => { state.auth.currentUser = user; return ack(command); });
    await expect(confirmGikaBatch(await confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(state.command).toHaveBeenCalledTimes(1);
  });
  it('abort before transport stops with unknown/pending and no mutation', async () => {
    const controller = new AbortController(); controller.abort();
    expect(await confirmGikaBatch(await confirmation(), request, 'account-a', controller.signal)).toMatchObject({ unknown: 1, pending: 1 });
    expect(state.command).not.toHaveBeenCalled();
  });
  it('receipt recovery may replace only the token, never the approved list/patch/scope', async () => {
    const value = await confirmation();
    state.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Pedido já usado.'));
    state.request.mockResolvedValueOnce({ confirmation: { ...value, token: `recovered.${'1'.repeat(64)}` } });
    expect((await confirmGikaBatch(value, request, 'account-a', signal())).applied).toBe(2);
    expect(state.request).toHaveBeenCalledWith('/gika/recover-batch', expect.objectContaining({ body: JSON.stringify(request) }), 'account-a');
    expect(state.command.mock.calls[1]![0].gikaBatch.confirmationToken).not.toBe(value.token);
  });
  it('recovery cannot silently substitute another target', async () => {
    const value = await confirmation(), changed = structuredClone(value); changed.plan.items[0]!.id = 'neighbor';
    state.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Pedido já usado.')); state.request.mockResolvedValueOnce({ confirmation: changed });
    await expect(confirmGikaBatch(value, request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_INVALID' });
    expect(state.command).toHaveBeenCalledTimes(1);
  });
});

it('expiry after one ack retains the known partial commit and never authorizes pending siblings', async () => {
  state.command.mockImplementationOnce(async command => ack(command)).mockRejectedValueOnce(new ApiError(409, 'GIKA_CONFIRMATION_EXPIRED', 'Expirou.'));
  await expect(confirmGikaBatch(await confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_EXPIRED', result: { applied: 1, failed: 1 } });
  expect(state.command).toHaveBeenCalledTimes(2); expect(state.request).not.toHaveBeenCalled();
});
