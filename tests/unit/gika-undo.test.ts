import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ uid: 'account-a' as string | null, send: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return fixture.uid ? { uid: fixture.uid } : null; } } }));
vi.mock('../../apps/web/src/platform/api', async original => ({ ...await original<typeof import('../../apps/web/src/platform/api')>(), sendCommand: fixture.send }));
import { creationUndoContextSchema, creationUndoOperationId, creationUndoEnvelope } from '../../packages/domain/src/gikaUndo';
import { executeCreationUndo } from '../../apps/web/src/features/gika/creationUndoBridge';
const context = { uid: 'account-a', creationOperationId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', entityId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', revision: 1 as const };
beforeEach(() => { fixture.uid = 'account-a'; fixture.send.mockReset(); });
describe('M3-T3 deterministic UI undo, no interpretation or persistence entry point', () => {
  it('identity is stable across retries and scoped to original UID, not task content', async () => {
    expect(await creationUndoOperationId(context)).toBe(await creationUndoOperationId({ ...context }));
    expect(await creationUndoOperationId(context)).not.toBe(await creationUndoOperationId({ ...context, uid: 'account-b' }));
    const command = await creationUndoEnvelope(context);
    expect(command).toMatchObject({ command: 'activity.trash', entityId: context.entityId, expectedRevision: 1, payload: {}, gikaUndo: { uid: context.uid, creationOperationId: context.creationOperationId } });
    expect(command).not.toHaveProperty('clientCreatedAt');
  });
  it('rejects unknown fields, changed revision or mismatched exact target', () => {
    for (const bad of [{ ...context, title: 'Academia' }, { ...context, revision: 2 }, { ...context, entityId: crypto.randomUUID() }]) expect(creationUndoContextSchema.safeParse(bad).success).toBe(false);
  });
  it('waits for real acknowledgement and checks its exact identity/revision', async () => {
    const command = await creationUndoEnvelope(context); let resolve!: (value: unknown) => void;
    fixture.send.mockImplementation(() => new Promise(r => { resolve = r; }));
    let succeeded = false; const pending = executeCreationUndo(context, new AbortController().signal).then(result => { succeeded = true; return result; });
    await vi.waitFor(() => expect(fixture.send).toHaveBeenCalledTimes(1)); expect(succeeded).toBe(false);
    resolve({ operationId: command.operationId, entityId: context.entityId, revision: 2, serverTime: new Date().toISOString(), result: 'applied' });
    expect(await pending).toMatchObject({ entityId: context.entityId, result: 'applied' });
    expect(fixture.send).toHaveBeenCalledWith(command, expect.objectContaining({ expectedUid: context.uid, queueOnNetworkError: false }));
    fixture.send.mockResolvedValue({ operationId: crypto.randomUUID(), entityId: context.entityId, revision: 2, serverTime: new Date().toISOString(), result: 'applied' });
    await expect(executeCreationUndo(context, new AbortController().signal)).rejects.toMatchObject({ code: 'GIKA_INVALID_RESPONSE' });
  });
  it.each([null, 'account-b'])('logout/account switch prevents dispatch %s', async uid => {
    fixture.uid = uid; await expect(executeCreationUndo(context, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' }); expect(fixture.send).not.toHaveBeenCalled();
  });
  it('switch during acknowledgement discards result; failed command never becomes success', async () => {
    const command = await creationUndoEnvelope(context);
    fixture.send.mockImplementation(async () => { fixture.uid = 'account-b'; return { operationId: command.operationId, entityId: context.entityId, revision: 2, serverTime: new Date().toISOString(), result: 'applied' }; });
    await expect(executeCreationUndo(context, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    fixture.uid = 'account-a'; fixture.send.mockRejectedValue(new Error('Precommit failure'));
    await expect(executeCreationUndo(context, new AbortController().signal)).rejects.toThrow('Precommit failure');
  });
});
