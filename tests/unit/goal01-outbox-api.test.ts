import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommandEnvelope } from '../../packages/domain/src/identity';

const state = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; getIdToken: (refresh: boolean) => Promise<string> } },
  pending: vi.fn(), remove: vi.fn(), queue: vi.fn(), guard: vi.fn(),
}));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: state.auth }));
vi.mock('../../apps/web/src/platform/outbox', () => ({
  offlineEnabled: () => true, pendingCommands: state.pending, removeCommand: state.remove, queueCommand: state.queue,
  withOutboxLeadership: (_uid: string, task: (guard: () => Promise<void>) => unknown) => task(state.guard),
}));
import { flushOutbox, sendCommand } from '../../apps/web/src/platform/api';
import { OutboxLeadershipLostError } from '../../apps/web/src/platform/outboxLeadership';

const command: CommandEnvelope = { command: 'note.update', operationId: '34cf5d26-90a8-4db0-925c-14c69a069a09', entityId: 'note-1', expectedRevision: 2, payload: { title: 'Private draft' } };
const receipt = { operationId: command.operationId, entityId: command.entityId, revision: 3, serverTime: new Date().toISOString(), result: 'applied' };
const entry = (createdAt = new Date().toISOString()) => ({ key: `a:${command.operationId}`, operationId: command.operationId, uid: 'a', command, createdAt });

beforeEach(() => {
  vi.clearAllMocks();
  state.auth.currentUser = { uid: 'a', getIdToken: vi.fn().mockResolvedValue('test-token') };
  state.pending.mockResolvedValue([entry()]);
  state.remove.mockResolvedValue(undefined); state.guard.mockResolvedValue(undefined);
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public options: unknown) {} });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(receipt)));
});
afterEach(() => vi.unstubAllGlobals());

describe('GOAL-01 outbox identity and recovery', () => {
  it('never sends queued account A data after switching accounts during token retrieval', async () => {
    state.auth.currentUser!.getIdToken = async () => { state.auth.currentUser = { uid: 'b', getIdToken: async () => 'b' }; return 'a'; };
    await flushOutbox('a');
    expect(fetch).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled();
  });
  it('binds direct command requests to their originating account', async () => {
    state.auth.currentUser!.getIdToken = async () => { state.auth.currentUser = null; return 'a'; };
    await expect(sendCommand(command)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetch).not.toHaveBeenCalled(); expect(state.queue).not.toHaveBeenCalled();
  });
  it('does not queue account A content if the network fails after switching to B', async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      state.auth.currentUser = { uid: 'b', getIdToken: async () => 'b' };
      throw new TypeError('connection lost');
    });
    await expect(sendCommand(command)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(state.queue).not.toHaveBeenCalled();
  });
  it('checks lease after the token wait and retains work when leadership expires', async () => {
    state.guard.mockRejectedValue(new OutboxLeadershipLostError());
    await flushOutbox('a');
    expect(fetch).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled();
  });
  it('retains a pending command after a mismatched successful acknowledgement', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...receipt, operationId: 'another-operation' }));
    await flushOutbox('a'); expect(state.remove).not.toHaveBeenCalled();
  });
  it('retains old commands if their recovered receipt identifies a different operation', async () => {
    state.pending.mockResolvedValue([entry('2020-01-01T00:00:00.000Z')]);
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: { ...receipt, operationId: 'other' } }));
    await flushOutbox('a'); expect(state.remove).not.toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(`/api/commands/${command.operationId}`);
  });
  it('retains acknowledgements for the wrong entity or revision', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...receipt, entityId: 'other-note' }))
      .mockResolvedValueOnce(Response.json({ ...receipt, revision: 99 }));
    await flushOutbox('a'); await flushOutbox('a'); expect(state.remove).not.toHaveBeenCalled();
  });
  it('accepts updateFuture receipts for the new series and initial revision', async () => {
    const queued = entry(); queued.command = { ...command, command: 'activity.updateFuture', expectedRevision: 20, payload: { newSeriesId: 'new-series' } };
    state.pending.mockResolvedValue([queued]);
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...receipt, entityId: 'new-series', revision: 1 }));
    await flushOutbox('a'); expect(state.remove).toHaveBeenCalledOnce();
  });
  it('accepts createCycle initial revision even though expectedRevision is the template revision', async () => {
    const queued = entry(); queued.command = { ...command, command: 'shoppingList.createCycle', expectedRevision: 20 };
    state.pending.mockResolvedValue([queued]); vi.mocked(fetch).mockResolvedValue(Response.json({ ...receipt, revision: 1 }));
    await flushOutbox('a'); expect(state.remove).toHaveBeenCalledOnce();
  });
  it('accepts a timer no-op acknowledgement at a newer revision', async () => {
    const queued = entry(); queued.command = { ...command, command: 'timeEntry.stop' };
    state.pending.mockResolvedValue([queued]); vi.mocked(fetch).mockResolvedValue(Response.json({ ...receipt, revision: 20 }));
    await flushOutbox('a'); expect(state.remove).toHaveBeenCalledOnce();
  });
  it('reconciles an old original command before replaying a recently queued entry', async () => {
    const queued = entry(); queued.command = { ...command, clientCreatedAt: '2020-01-01T00:00:00.000Z' };
    state.pending.mockResolvedValue([queued]); vi.mocked(fetch).mockResolvedValue(Response.json({ result: receipt }));
    await flushOutbox('a'); expect(vi.mocked(fetch).mock.calls[0]![0]).toBe(`/api/commands/${command.operationId}`);
    expect(vi.mocked(fetch).mock.calls[0]![1]!.method).toBeUndefined();
  });
  it('recovers old acknowledged commands by receipt without resending', async () => {
    state.pending.mockResolvedValue([entry('2020-01-01T00:00:00.000Z')]);
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: receipt }));
    await flushOutbox('a'); expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.remove).toHaveBeenCalledWith('a', command.operationId);
  });
  it('retains commands after a lost acknowledgement and removes only after retry confirms', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('connection lost')).mockResolvedValueOnce(Response.json({ ...receipt, result: 'alreadyApplied' }));
    await flushOutbox('a'); expect(state.remove).not.toHaveBeenCalled();
    await flushOutbox('a'); expect(state.remove).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string)).toEqual(command);
  });
  it('preserves revision conflicts and dependent commands', async () => {
    const next = { ...entry(), operationId: 'dependency', command: { ...command, operationId: 'dependency', dependsOn: [command.operationId] } };
    state.pending.mockResolvedValue([entry(), next]);
    vi.mocked(fetch).mockResolvedValue(Response.json({ code: 'REVISION_CONFLICT', message: 'Conflict' }, { status: 409 }));
    await flushOutbox('a'); expect(state.remove).not.toHaveBeenCalled(); expect(fetch).toHaveBeenCalledTimes(1);
  });
});
