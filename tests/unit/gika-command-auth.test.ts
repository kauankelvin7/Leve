import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ user: null as { uid: string; getIdToken: ReturnType<typeof vi.fn> } | null, queue: vi.fn(), fetch: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return fixture.user; } } }));
vi.mock('../../apps/web/src/platform/outbox', () => ({ offlineEnabled: () => true, queueCommand: fixture.queue, pendingCommands: vi.fn(), removeCommand: vi.fn(), withOutboxLeadership: vi.fn() }));
import { sendCommand } from '../../apps/web/src/platform/api';
import { commandEnvelopeSchema } from '../../packages/domain/src/identity';
const command = commandEnvelopeSchema.parse({ command: 'activity.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: {} });
beforeEach(() => { fixture.queue.mockReset(); fixture.fetch.mockReset(); vi.stubGlobal('fetch', fixture.fetch); });
describe('fresh UID/cancellation check after asynchronous token refresh, actual sendCommand', () => {
  it.each([null, { uid: 'account-b', getIdToken: vi.fn() }])('never sends a mutation on logout/switch during getIdToken %j', async user => {
    let resume!: (token: string) => void;
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(() => new Promise(resolve => { resume = resolve; })) };
    const pending = sendCommand(command, { expectedUid: 'account-a', queueOnNetworkError: false });
    fixture.user = user; resume('local-fixture-token');
    await expect(pending).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fixture.fetch).not.toHaveBeenCalled(); expect(fixture.queue).not.toHaveBeenCalled();
  });
  it('abort during token wait never sends or queues', async () => {
    const controller = new AbortController();
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(async () => { controller.abort(); return 'local-fixture-token'; }) };
    await expect(sendCommand(command, { expectedUid: 'account-a', signal: controller.signal, queueOnNetworkError: false })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(fixture.fetch).not.toHaveBeenCalled(); expect(fixture.queue).not.toHaveBeenCalled();
  });
  it('Gika network failure never enters conventional opt-in outbox', async () => {
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(async () => 'local-fixture-token') }; fixture.fetch.mockRejectedValue(new Error('Network'));
    await expect(sendCommand(command, { expectedUid: 'account-a', queueOnNetworkError: false })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(fixture.queue).not.toHaveBeenCalled();
  });
  it('conventional default still queues network failure in opt-in outbox', async () => {
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(async () => 'local-fixture-token') }; fixture.fetch.mockRejectedValue(new Error('Network'));
    await expect(sendCommand(command)).rejects.toMatchObject({ code: 'SAVED_LOCALLY' }); expect(fixture.queue).toHaveBeenCalledWith('account-a', command);
  });
});

describe('M3-T3 actual undo bridge/token boundary', () => {
  it.each([null, { uid: 'account-b', getIdToken: vi.fn() }])('undo cannot dispatch on logout/switch during token refresh %j', async changed => {
    const { executeCreationUndo } = await import('../../apps/web/src/features/gika/creationUndoBridge');
    let resume!: (token: string) => void;
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(() => new Promise(resolve => { resume = resolve; })) };
    const id = '3dad14e9-a25a-48a3-a5ab-d05d277c3991';
    const result = executeCreationUndo({ uid: 'account-a', creationOperationId: id, entityId: id, revision: 1 }, new AbortController().signal);
    const rejected = expect(result).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await vi.waitFor(() => expect(resume).toBeTypeOf('function'));
    fixture.user = changed; resume('local-fixture-token'); await rejected;
    expect(fixture.fetch).not.toHaveBeenCalled(); expect(fixture.queue).not.toHaveBeenCalled();
  });
});

describe('M4-T1 completion auth immediately after token wait',()=>{
  it.each([null,{uid:'account-b',getIdToken:vi.fn()}])('does not dispatch completion on logout/switch %j',async changed=>{
    const {executeCompletion}=await import('../../apps/web/src/features/gika/completionBridge');
    const {completionEnvelope}=await import('../../packages/domain/src/gikaCompletion');
    const task={id:'target',title:'Academia',dueDate:'2026-10-01',timeZone:'America/Sao_Paulo',revision:3};
    let resume!: (token:string)=>void;
    fixture.user={uid:'account-a',getIdToken:vi.fn(()=>new Promise(resolve=>{resume=resolve;}))};
    const cmd=await completionEnvelope(task,{requestId:crypto.randomUUID(),text:'Terminei academia'});
    const result=executeCompletion(task,cmd,'account-a',new AbortController().signal);
    const rejected=expect(result).rejects.toMatchObject({code:'AUTH_REQUIRED'});
    await vi.waitFor(()=>expect(resume).toBeTypeOf('function'));
    fixture.user=changed;resume('local-fixture-token');await rejected;
    expect(fixture.fetch).not.toHaveBeenCalled();expect(fixture.queue).not.toHaveBeenCalled();
  });
});

describe('M4-T2 title update auth immediately after token wait', () => {
  it.each([null, { uid: 'account-b', getIdToken: vi.fn() }])('does not send or queue on logout/switch %j', async changed => {
    const { executeUpdate } = await import('../../apps/web/src/features/gika/updateBridge');
    const { updateEnvelope } = await import('../../packages/domain/src/gikaUpdate');
    const task = { id: 'target', title: 'Academia', dueDate: '2026-10-01', timeZone: 'America/Sao_Paulo', revision: 3, patch: { title: 'Treino' } };
    let resume!: (token: string) => void;
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(() => new Promise(resolve => { resume = resolve; })) };
    const cmd = await updateEnvelope(task, { requestId: crypto.randomUUID(), text: 'Renomeia academia para Treino' });
    const result = executeUpdate(task, cmd, 'account-a', new AbortController().signal);
    const rejected = expect(result).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await vi.waitFor(() => expect(resume).toBeTypeOf('function'));
    fixture.user = changed; resume('local-fixture-token'); await rejected;
    expect(fixture.fetch).not.toHaveBeenCalled(); expect(fixture.queue).not.toHaveBeenCalled();
  });
});

describe('M4-T3 reschedule auth immediately after token wait', () => {
  it.each([null, { uid: 'account-b', getIdToken: vi.fn() }])('does not send or queue on logout/switch %j', async changed => {
    const { executeReschedule } = await import('../../apps/web/src/features/gika/rescheduleBridge');
    const { rescheduleEnvelope } = await import('../../packages/domain/src/gikaReschedule');
    const task = { id: 'target', title: 'Academia', dueDate: '2026-10-01', timeZone: 'America/Sao_Paulo', revision: 3, dueTime: null, patch: { dueDate: '2026-10-02' } };
    let resume!: (token: string) => void;
    fixture.user = { uid: 'account-a', getIdToken: vi.fn(() => new Promise(resolve => { resume = resolve; })) };
    const cmd = await rescheduleEnvelope(task, { requestId: crypto.randomUUID(), text: 'Move academia para amanhã' });
    const result = executeReschedule(task, cmd, 'account-a', new AbortController().signal);
    const rejected = expect(result).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    await vi.waitFor(() => expect(resume).toBeTypeOf('function'));
    fixture.user = changed; resume('local-fixture-token'); await rejected;
    expect(fixture.fetch).not.toHaveBeenCalled(); expect(fixture.queue).not.toHaveBeenCalled();
  });
});
