import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recurrenceChoiceSchema, recurrenceConfirmationSchema } from '../../packages/domain/src/gikaRecurrence';
const state = vi.hoisted(() => ({ auth: { currentUser: { uid: 'account-a' } as { uid: string } | null }, request: vi.fn(), command: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: state.auth }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: state.request, sendCommand: state.command, ApiError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
import { ApiError } from '../../apps/web/src/platform/api';
import { chooseGikaRecurrence, confirmGikaRecurrence } from '../../apps/web/src/features/gika/recurrenceBridge';
const hash = '0'.repeat(64), token = `test.${hash}`;
const request = { requestId: 'f3a2ab71-21cf-40a7-842f-0e3aeff1fe8b', text: 'Renomeia Leitura para Estudo' };
const choice = recurrenceChoiceSchema.parse({ proposal: { operation: 'update', task: { id: 'original', title: 'Leitura', dueDate: '2026-10-01', dueTime: null, timeZone: 'America/Sao_Paulo', revision: 1 }, patch: { title: 'Estudo' }, recurrence: { seriesId: 'series', occurrenceKey: '2026-10-01', seriesHash: hash, targetHash: hash, futureHash: hash, futureCount: 3, futureAllowed: true } }, options: ['occurrence', 'future'], token });
const confirmation = (future = false) => recurrenceConfirmationSchema.parse({ policy: { kind: 'confirm', risk: future ? 'high' : 'medium', reason: 'RECURRENCE_PREVIEW_REQUIRED' }, effect: { ...choice.proposal, scope: future ? 'future' : 'occurrence', newSeriesId: future ? 'f22c3f1c-a2ef-4501-a18c-1babba0f1276' : null }, token });
const signal = () => new AbortController().signal;
const ack = { operationId: request.requestId, entityId: 'original', revision: 2, result: 'applied', serverTime: '2026-10-01T12:00:00.000Z' };
beforeEach(() => { state.auth.currentUser = { uid: 'account-a' }; state.request.mockReset(); state.command.mockReset(); });
describe('M5-T3 deterministic recurrence UI bridge', () => {
  it('scope choice only calls deterministic authenticated endpoint; never writes', async () => {
    state.request.mockResolvedValue({ confirmation: confirmation() });
    expect(await chooseGikaRecurrence(choice, 'occurrence', request, 'account-a', signal())).toEqual(confirmation());
    expect(state.request).toHaveBeenCalledWith('/gika/choose-recurrence', expect.objectContaining({ body: JSON.stringify({ ...request, token, scope: 'occurrence' }) }), 'account-a');
    expect(state.command).not.toHaveBeenCalled();
  });
  it('unavailable scope and tampered choice response never produce grant', async () => {
    await expect(chooseGikaRecurrence({ ...choice, options: ['occurrence'] }, 'future', request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_INVALID' });
    expect(state.request).not.toHaveBeenCalled();
    state.request.mockResolvedValue({ confirmation: confirmation(true) });
    await expect(chooseGikaRecurrence(choice, 'occurrence', request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_INVALID' });
  });
  it('only real matching command acknowledgement produces structured occurrence success', async () => {
    state.command.mockResolvedValue(ack);
    expect(await confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).toMatchObject({ id: 'original', title: 'Estudo', revision: 2, affectedCount: 1 });
    expect(state.command).toHaveBeenCalledWith(expect.objectContaining({ operationId: request.requestId, command: 'activity.update', entityId: 'original', expectedRevision: 1, payload: { title: 'Estudo' } }), expect.objectContaining({ expectedUid: 'account-a', queueOnNetworkError: false }));
    expect(state.request).not.toHaveBeenCalled();
  });
  it('future acknowledgement uses real new series ID and revision1', async () => {
    const future = confirmation(true);
    state.command.mockResolvedValue({ ...ack, entityId: future.effect.newSeriesId, revision: 1 });
    expect(await confirmGikaRecurrence(future, request, 'account-a', signal())).toMatchObject({ id: future.effect.newSeriesId, scope: 'future', affectedCount: 3 });
    const firstCall = state.command.mock.calls[0]; if (!firstCall) throw Error('Expected future command call.');
    expect(firstCall[0]).toMatchObject({ command: 'activity.updateFuture', entityId: 'original', payload: { patch: { title: 'Estudo' }, newSeriesId: future.effect.newSeriesId } });
  });
  it.each([{ ...ack, entityId: 'neighbor' }, { ...ack, revision: 99 }, { ...ack, operationId: 'b7e8a9fc-79ec-44af-bb10-89bc9d509cbd' }])('mismatched acknowledgement cannot show success', async invalid => {
    state.command.mockResolvedValue(invalid);
    await expect(confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_INVALID_RESPONSE' });
  });
  it('lost response retry sends identical operation without model/renewal', async () => {
    state.command.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de conexão.')).mockResolvedValueOnce({ ...ack, result: 'alreadyApplied' });
    await expect(confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(await confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).toMatchObject({ result: 'alreadyApplied' });
    const firstCall = state.command.mock.calls[0], secondCall = state.command.mock.calls[1]; if (!firstCall || !secondCall) throw Error('Expected original and retry command calls.');
    expect(firstCall[0]).toEqual(secondCall[0]); expect(state.request).not.toHaveBeenCalled();
  });
  it('mismatch only recovers committed confirmation at deterministic endpoint', async () => {
    state.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Pedido repetido.')).mockResolvedValueOnce(ack);
    state.request.mockResolvedValueOnce({ recurrenceConfirmation: confirmation() });
    await confirmGikaRecurrence(confirmation(), request, 'account-a', signal());
    expect(state.request).toHaveBeenCalledWith('/gika/recover-confirmation', expect.objectContaining({ body: JSON.stringify(request) }), 'account-a');
  });
  it.each(['scope', 'operation', 'target', 'malformed'])('recovery %s mismatch cannot broaden or change the approved UI action', async variant => {
    const original = confirmation();
    const effect = variant === 'scope' ? confirmation(true).effect : variant === 'operation' ? { ...original.effect, operation: 'complete', patch: { status: 'completed' } } : { ...original.effect, task: { ...original.effect.task, id: 'neighbor' } };
    state.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Pedido repetido.'));
    state.request.mockResolvedValueOnce({ recurrenceConfirmation: variant === 'malformed' ? { private: 'PRIVATE_VALUE' } : { ...original, effect } });
    await expect(confirmGikaRecurrence(original, request, 'account-a', signal())).rejects.toMatchObject({ code: 'GIKA_CONFIRMATION_INVALID' });
    expect(state.command).toHaveBeenCalledTimes(1);
  });
  it('logout/account change before choice or execution blocks every transport', async () => {
    state.auth.currentUser = { uid: 'account-b' };
    await expect(chooseGikaRecurrence(choice, 'occurrence', request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await expect(confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(state.command).not.toHaveBeenCalled(); expect(state.request).not.toHaveBeenCalled();
  });
  it('account change during choice or ack discards result', async () => {
    state.request.mockImplementationOnce(async () => { state.auth.currentUser = null; return { confirmation: confirmation() }; });
    await expect(chooseGikaRecurrence(choice, 'occurrence', request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    state.auth.currentUser = { uid: 'account-a' };
    state.command.mockImplementationOnce(async () => { state.auth.currentUser = { uid: 'account-b' }; return ack; });
    await expect(confirmGikaRecurrence(confirmation(), request, 'account-a', signal())).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
});
