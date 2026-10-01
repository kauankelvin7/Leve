import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ user: { uid: 'account-a' } as { uid: string } | null, request: vi.fn(), command: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return fixture.user; } } }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: fixture.request, sendCommand: fixture.command, ApiError: class extends Error { status: number; code: string; constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; } } }));
import { apiAdapter, createApiAdapter } from '../../apps/web/src/features/gika/apiAdapter';
import { createTaskEnvelope, executeCreateTask } from '../../apps/web/src/features/gika/commandBridge';
const input = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'O que tenho hoje?' };
const response = { text: 'Veja sua agenda para o período consultado.', simulated: false, reads: [] };
beforeEach(() => { fixture.user = { uid: 'account-a' }; fixture.request.mockReset(); fixture.command.mockReset(); });
describe('real API preserves mock adapter contract and account isolation', () => {
  it('uma consulta autenticada, payload mínimo sem command/outbox/contexto cliente', async () => {
    fixture.request.mockResolvedValue(response);
    await expect(apiAdapter(input, new AbortController().signal)).resolves.toEqual(response);
    expect(fixture.request).toHaveBeenCalledTimes(1);
    const [path, options] = fixture.request.mock.calls[0]!;
    expect(path).toBe('/gika/respond'); expect(options.method).toBe('POST'); expect(JSON.parse(options.body)).toEqual(input);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([null, { ...response, simulated: true }, { ...response, preview: 'organize-demo' }, { ...response, command: 'activity.create' }])('rejeita saída inválida/demo/mutável %j', async value => {
    fixture.request.mockResolvedValue(value);
    await expect(apiAdapter(input, new AbortController().signal)).rejects.toThrow();
  });
  it('troca de conta ou logout durante HTTP descarta a resposta antiga', async () => {
    for (const user of [{ uid: 'account-b' }, null]) {
      fixture.user = { uid: 'account-a' };
      let resolve!: (value: unknown) => void;
      fixture.request.mockImplementation(() => new Promise(done => { resolve = done; }));
      const pending = apiAdapter(input, new AbortController().signal); fixture.user = user; resolve(response);
      await expect(pending).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    }
  });
  it('cancelamento invalida resultado mesmo quando transport ignora abort', async () => {
    fixture.request.mockImplementation(async () => { controller.abort(); return response; });
    const controller = new AbortController();
    await expect(apiAdapter(input, controller.signal)).rejects.toThrow();
  });
});

const task = { title: 'Academia', dueDate: '2026-10-02', dueTime: null, timeZone: 'America/Sao_Paulo' };
const creation = { text: 'Preparando a tarefa…', simulated: false, reads: [], createTask: task };
const receipt = (command: Awaited<ReturnType<typeof createTaskEnvelope>>) => ({ operationId: command.operationId, entityId: command.entityId, revision: 1, serverTime: '2026-10-01T12:00:00Z', result: 'applied' });
describe('M3-T1 one existing command, structured success only after its acknowledgement', () => {
  it('valid creation uses software IDs/revision/defaults and a fresh authenticated command', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => receipt(command));
    const result = await createApiAdapter()({ ...input, text: 'Academia amanhã' }, new AbortController().signal);
    expect(result).toMatchObject({ text: 'Tarefa adicionada.', createdTask: { ...task, revision: 1, result: 'applied' } });
    expect(fixture.command).toHaveBeenCalledTimes(1);
    const [command, options] = fixture.command.mock.calls[0]!;
    expect(command).toMatchObject({ command: 'activity.create', expectedRevision: 0, payload: { title: 'Academia', reminderSpecs: [], schedule: { type: 'task', dueDate: task.dueDate, timeZone: task.timeZone } } });
    expect(command.operationId).toBe(input.requestId); expect(command.entityId).toBe(command.operationId);
    expect(command.payload).not.toHaveProperty('uid'); expect(command.payload).not.toHaveProperty('owner');
    expect(options).toMatchObject({ expectedUid: 'account-a', queueOnNetworkError: false }); expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([null, { uid: 'account-b' }])('logout/account change during model wait prevents dispatch %j', async user => {
    fixture.request.mockImplementation(async () => { fixture.user = user; return creation; });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('unauthenticated or cancelled flow never interprets/dispatches', async () => {
    fixture.user = null;
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    fixture.user = { uid: 'account-a' }; const controller = new AbortController(); controller.abort();
    await expect(createApiAdapter()(input, controller.signal)).rejects.toThrow();
    expect(fixture.request).not.toHaveBeenCalled(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it.each([{ ...task, uid: 'other' }, { ...task, title: '' }, { ...task, dueDate: '2026-02-30' }])('invalid descriptor never writes %j', async createTask => {
    fixture.request.mockResolvedValue({ ...creation, createTask });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it('command failure does not confirm; reconstructed receipt envelope remains stable on manual retry', async () => {
    const adapter = createApiAdapter(); fixture.request.mockResolvedValue(creation); fixture.command.mockRejectedValueOnce(new Error('Command failed')).mockImplementationOnce(async command => receipt(command));
    await expect(adapter(input, new AbortController().signal)).rejects.toThrow('Command failed');
    await expect(adapter(input, new AbortController().signal)).resolves.toHaveProperty('createdTask');
    expect(fixture.request).toHaveBeenCalledTimes(2); expect(fixture.command.mock.calls[1]![0]).toEqual(fixture.command.mock.calls[0]![0]);
  });
  it('model narrative or forged createdTask is never command success', async () => {
    fixture.request.mockResolvedValue(response);
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.not.toHaveProperty('createdTask');
    fixture.request.mockResolvedValue({ ...response, createdTask: { ...task, id: 'fake', revision: 1, result: 'applied' } });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it('invalid or mismatched receipt and account change after dispatch never confirm', async () => {
    for (const value of [null, { result: 'applied' }, { ...receipt(await createTaskEnvelope(task, input)), entityId: 'unrelated' }]) {
      fixture.request.mockResolvedValue(creation); fixture.command.mockResolvedValue(value);
      await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    }
    fixture.command.mockImplementation(async command => { fixture.user = null; return receipt(command); });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('bridge rejects a different command/payload before sendCommand', async () => {
    const envelope = await createTaskEnvelope(task, input);
    for (const command of [{ ...envelope, gika: undefined }, { ...envelope, command: 'activity.update' }, { ...envelope, payload: { ...(envelope.payload as Record<string, unknown>), title: 'Invented' } }]) {
      await expect(executeCreateTask(task, command, 'account-a', new AbortController().signal)).rejects.toThrow();
    }
    expect(fixture.command).not.toHaveBeenCalled();
  });
});

describe('M3-T2 independent adapters and technical retransmission', () => {
  it('simultaneous independent adapters derive identical commands; no shared memory is required', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => receipt(command));
    const [first, second] = await Promise.all([createApiAdapter()(input, new AbortController().signal), createApiAdapter()(input, new AbortController().signal)]);
    expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
    expect(first).toEqual(second);
  });
  it('retry after losing the acknowledgement recreates the command in a fresh adapter and preserves real ID', async () => {
    fixture.request.mockResolvedValue(creation);
    fixture.command.mockRejectedValueOnce(new Error('Lost HTTP acknowledgement')).mockImplementationOnce(async command => ({ ...receipt(command), result: 'alreadyApplied' }));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow('Lost HTTP acknowledgement');
    const result = await createApiAdapter()(input, new AbortController().signal);
    expect(result).toMatchObject({ createdTask: { id: input.requestId, result: 'alreadyApplied' }, text: 'Tarefa adicionada.' });
    expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
  });
  it('a new intentional action with identical content receives a different command ID', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => receipt(command));
    const adapter = createApiAdapter();
    await adapter(input, new AbortController().signal); await adapter({ ...input, requestId: crypto.randomUUID() }, new AbortController().signal);
    expect(fixture.command.mock.calls[0]![0].operationId).not.toBe(fixture.command.mock.calls[1]![0].operationId);
  });
  it('an interpretation racing with a committed receipt recovers its snapshot once without treating mismatch as success', async () => {
    const { ApiError } = await import('../../apps/web/src/platform/api');
    fixture.request.mockResolvedValueOnce({ ...creation, createTask: { ...task, dueDate: '2026-10-03' } }).mockResolvedValueOnce(creation);
    fixture.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Mismatch')).mockImplementationOnce(async command => ({ ...receipt(command), result: 'alreadyApplied' }));
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.toMatchObject({ createdTask: { ...task, id: input.requestId, result: 'alreadyApplied' } });
    expect(fixture.request).toHaveBeenCalledTimes(2); expect(fixture.command).toHaveBeenCalledTimes(2);
    fixture.request.mockRejectedValue(new ApiError(409, 'OPERATION_MISMATCH', 'Mismatch'));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'OPERATION_MISMATCH' });
    expect(fixture.command).toHaveBeenCalledTimes(2);
  });
});

const completeTask = { id: 'target', title: 'Academia', dueDate: '2026-10-01', timeZone: 'America/Sao_Paulo', revision: 3 };
const completion = { text: 'Preparando a conclusão…', simulated: false, reads: [], completeTask };
const completeAck = (c: { operationId: string; entityId: string; expectedRevision: number }) => ({ operationId: c.operationId, entityId: c.entityId, revision: c.expectedRevision + 1, serverTime: '2026-10-01T12:00:00Z', result: 'applied' });
describe('M4-T1 structured completion only after actual command acknowledgement', () => {
  it('success preserves exact resolved entity and revision with software identity', async () => {
    fixture.request.mockResolvedValue(completion); fixture.command.mockImplementation(async c => completeAck(c));
    const result=await createApiAdapter()({...input,text:'Terminei academia'},new AbortController().signal);
    expect(result).toMatchObject({text:'Tarefa concluída.',completedTask:{...completeTask,revision:4,result:'applied'}});
    expect(fixture.command.mock.calls[0]![0]).toMatchObject({command:'activity.setStatus',operationId:input.requestId,entityId:'target',expectedRevision:3,payload:{status:'completed'}});
  });
  it('lost acknowledgement retains original envelope/revision, not refreshed model selection', async () => {
    const adapter=createApiAdapter(); fixture.request.mockResolvedValue(completion);
    fixture.command.mockRejectedValueOnce(new Error('lost ack')).mockImplementation(async c=>({...completeAck(c),result:'alreadyApplied'}));
    await expect(adapter(input,new AbortController().signal)).rejects.toThrow();
    fixture.request.mockResolvedValue({...completion,completeTask:{...completeTask,id:'wrong',revision:99}});
    await expect(adapter(input,new AbortController().signal)).resolves.toMatchObject({completedTask:{id:'target',revision:4,result:'alreadyApplied'}});
    expect(fixture.request).toHaveBeenCalledTimes(1);expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
  });
  it.each([null,{uid:'account-b'}])('account changes during resolution prevent any completion %j',async user=>{
    fixture.request.mockImplementation(async()=>{fixture.user=user;return completion;});
    await expect(createApiAdapter()(input,new AbortController().signal)).rejects.toMatchObject({code:'AUTH_REQUIRED'});expect(fixture.command).not.toHaveBeenCalled();
  });
  it('already-completed observation, ambiguity and missing task never dispatch',async()=>{
    for(const status of ['already_completed','ambiguous','not_found']){
      fixture.request.mockResolvedValue({text:'Confira sua agenda.',simulated:false,reads:[],completionResolution:{status,candidates:[]}});
      await createApiAdapter()(input,new AbortController().signal);
    }
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it('command failure, wrong ack and account change during ack never confirm',async()=>{
    for(const outcome of ['failure','wrong','logout']){
      fixture.user={uid:'account-a'};fixture.request.mockResolvedValue(completion);
      fixture.command.mockImplementation(async c=>{if(outcome==='failure')throw new Error('failure');if(outcome==='logout')fixture.user=null;return {...completeAck(c),entityId:outcome==='wrong'?'wrong':c.entityId};});
      await expect(createApiAdapter()(input,new AbortController().signal)).rejects.toThrow();
    }
  });
});

it('M4 pending technical retry recovers receipt if concurrent execution committed a different envelope',async()=>{
  const {ApiError}=await import('../../apps/web/src/platform/api');
  const adapter=createApiAdapter();fixture.request.mockResolvedValueOnce(completion).mockResolvedValueOnce({...completion,completeTask:{...completeTask,revision:4}});
  fixture.command.mockRejectedValueOnce(new Error('lost response')).mockRejectedValueOnce(new ApiError(409,'OPERATION_MISMATCH','Mismatch')).mockImplementationOnce(async c=>({...completeAck(c),result:'alreadyApplied'}));
  await expect(adapter(input,new AbortController().signal)).rejects.toThrow();
  await expect(adapter(input,new AbortController().signal)).resolves.toMatchObject({completedTask:{id:'target',revision:5,result:'alreadyApplied'}});
  expect(fixture.request).toHaveBeenCalledTimes(2);expect(fixture.command).toHaveBeenCalledTimes(3);
});

const updateTask = { ...completeTask, patch: { title: 'Treino' } };
const update = { text: 'Preparando a alteração…', simulated: false, reads: [], updateTask };
describe('M4-T2 patch bridge and structured acknowledgement', () => {
  it('uses only title patch, original revision and software identity; awaits real ack', async () => {
    fixture.request.mockResolvedValue(update);
    let resume!: (ack: unknown) => void;
    fixture.command.mockImplementation(() => new Promise(resolve => { resume = resolve; }));
    let settled = false;
    const result = createApiAdapter()(input, new AbortController().signal).then(value => { settled = true; return value; });
    await vi.waitFor(() => expect(resume).toBeTypeOf('function'));
    const [command, options] = fixture.command.mock.calls[0]!;
    expect(command).toMatchObject({ command: 'activity.update', operationId: input.requestId, entityId: 'target', expectedRevision: 3, payload: { title: 'Treino' } });
    expect(options).toMatchObject({ expectedUid: 'account-a', queueOnNetworkError: false });
    expect(settled).toBe(false); resume(completeAck(command));
    await expect(result).resolves.toMatchObject({ text: 'Tarefa atualizada.', updatedTask: { id: 'target', title: 'Treino', revision: 4, result: 'applied' } });
  });
  it.each(['unchanged', 'ambiguous', 'not_found', 'partial', 'clarify', 'unsupported'])('observation %s does not dispatch', async status => {
    fixture.request.mockResolvedValue({ ...response, updateResolution: { status, candidates: [] } });
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.not.toHaveProperty('updatedTask');
    expect(fixture.command).not.toHaveBeenCalled();
  });
  it.each([{ ...updateTask, uid: 'other' }, { ...updateTask, patch: { title: 'Treino', dueDate: '2026-10-02' } }, { ...updateTask, patch: { title: '' } }])('strict descriptor rejects forged fields %j', async value => {
    fixture.request.mockResolvedValue({ ...update, updateTask: value });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it('narrative or forged updatedTask never confirms a mutation', async () => {
    fixture.request.mockResolvedValue({ ...response, text: 'Renomeei Academia.' });
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.not.toHaveProperty('updatedTask');
    fixture.request.mockResolvedValue({ ...response, updatedTask: { ...completeTask, result: 'applied' } });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it.each([null, { uid: 'account-b' }])('logout/switch during resolution and acknowledgement rejects old result %j', async user => {
    fixture.request.mockImplementation(async () => { fixture.user = user; return update; });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' }); expect(fixture.command).not.toHaveBeenCalled();
    fixture.user = { uid: 'account-a' }; fixture.request.mockResolvedValue(update);
    fixture.command.mockImplementation(async c => { fixture.user = user; return completeAck(c); });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('command failure and mismatched acknowledgement do not confirm', async () => {
    fixture.request.mockResolvedValue(update); fixture.command.mockRejectedValueOnce(new Error('precommit'));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow('precommit');
    fixture.command.mockImplementation(async c => ({ ...completeAck(c), entityId: 'wrong' }));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'GIKA_INVALID_RESPONSE' });
  });
  it('lost acknowledgement preserves exact patch/revision and independent adapters replay receipt', async () => {
    const adapter = createApiAdapter(); fixture.request.mockResolvedValue(update);
    fixture.command.mockRejectedValueOnce(new Error('lost response')).mockImplementation(async c => ({ ...completeAck(c), result: 'alreadyApplied' }));
    await expect(adapter(input, new AbortController().signal)).rejects.toThrow();
    await expect(adapter(input, new AbortController().signal)).resolves.toMatchObject({ updatedTask: { id: 'target', title: 'Treino', revision: 4, result: 'alreadyApplied' } });
    expect(fixture.request).toHaveBeenCalledTimes(1); expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
    await createApiAdapter()(input, new AbortController().signal);
    expect(fixture.command.mock.calls[2]![0]).toEqual(fixture.command.mock.calls[0]![0]);
  });
  it('concurrent adapters derive same envelope while a fresh intent derives another ID', async () => {
    fixture.request.mockResolvedValue(update); fixture.command.mockImplementation(async c => completeAck(c));
    await Promise.all([createApiAdapter()(input, new AbortController().signal), createApiAdapter()(input, new AbortController().signal)]);
    expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);
    await createApiAdapter()({ ...input, requestId: crypto.randomUUID() }, new AbortController().signal);
    expect(fixture.command.mock.calls[2]![0].operationId).not.toBe(input.requestId);
  });
  it('receipt mismatch is recovered once and is never falsely acknowledged', async () => {
    const { ApiError } = await import('../../apps/web/src/platform/api');
    fixture.request.mockResolvedValueOnce({ ...update, updateTask: { ...updateTask, revision: 4 } }).mockResolvedValueOnce(update);
    fixture.command.mockRejectedValueOnce(new ApiError(409, 'OPERATION_MISMATCH', 'Mismatch')).mockImplementationOnce(async c => ({ ...completeAck(c), result: 'alreadyApplied' }));
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.toMatchObject({ updatedTask: { revision: 4, result: 'alreadyApplied' } });
    expect(fixture.request).toHaveBeenCalledTimes(2); expect(fixture.command).toHaveBeenCalledTimes(2);
  });
  it('revision conflict retains its category and never refreshes revision automatically', async () => {
    const { ApiError } = await import('../../apps/web/src/platform/api');
    fixture.request.mockResolvedValue(update); fixture.command.mockRejectedValue(new ApiError(409, 'REVISION_CONFLICT', 'Conflict'));
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'GIKA_UPDATE_CONFLICT', message: 'Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.' });
    expect(fixture.request).toHaveBeenCalledTimes(1); expect(fixture.command).toHaveBeenCalledTimes(1);
  });
  it('bridge rejects different command/patch or missing tag before dispatch', async () => {
    const { updateEnvelope } = await import('../../packages/domain/src/gikaUpdate');
    const { executeUpdate } = await import('../../apps/web/src/features/gika/updateBridge');
    const envelope = await updateEnvelope(updateTask, input);
    for (const command of [{ ...envelope, gikaUpdate: undefined }, { ...envelope, command: 'activity.trash' }, { ...envelope, payload: { title: 'Outro' } }]) {
      await expect(executeUpdate(updateTask, command, 'account-a', new AbortController().signal)).rejects.toThrow();
    }
    expect(fixture.command).not.toHaveBeenCalled();
  });
});

const rescheduleTask={...completeTask,dueTime:'10:00',patch:{dueDate:'2026-10-02'}};
it('M4-T3 interpretation only offers structured preview, never dispatches before UI confirmation',async()=>{
 fixture.request.mockResolvedValue({...response,rescheduleTask});await expect(createApiAdapter()(input,new AbortController().signal)).resolves.toMatchObject({rescheduleTask});expect(fixture.command).not.toHaveBeenCalled();
});
describe('M4-T3 deterministic bridge auth/ack and retry',()=>{
 it('waits real ack; original identity/revision/patch and no provider call on confirmation',async()=>{
  const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');const {executeReschedule}=await import('../../apps/web/src/features/gika/rescheduleBridge');const c=await rescheduleEnvelope(rescheduleTask,input);
  let resume!:(value:unknown)=>void;fixture.command.mockImplementation(()=>new Promise(resolve=>{resume=resolve;}));let settled=false;const p=executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal).then(r=>{settled=true;return r;});await vi.waitFor(()=>expect(resume).toBeTypeOf('function'));expect(settled).toBe(false);resume(completeAck(c as Parameters<typeof completeAck>[0]));await expect(p).resolves.toMatchObject({id:'target',dueDate:'2026-10-02',dueTime:'10:00',revision:4});expect(fixture.request).not.toHaveBeenCalled();
 });
 it.each([null,{uid:'account-b'}])('logout/switch at dispatch and ack rejects %j',async user=>{
  const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');const {executeReschedule}=await import('../../apps/web/src/features/gika/rescheduleBridge');const c=await rescheduleEnvelope(rescheduleTask,input);fixture.user=user;await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).rejects.toMatchObject({code:'AUTH_REQUIRED'});expect(fixture.command).not.toHaveBeenCalled();fixture.user={uid:'account-a'};fixture.command.mockImplementation(async c=>{fixture.user=user;return completeAck(c);});await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).rejects.toMatchObject({code:'AUTH_REQUIRED'});
 });
 it('failure/lost ack reuses exact envelope; wrong ack/conflict cannot falsely confirm',async()=>{
  const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');const {executeReschedule}=await import('../../apps/web/src/features/gika/rescheduleBridge');const {ApiError}=await import('../../apps/web/src/platform/api');const c=await rescheduleEnvelope(rescheduleTask,input);fixture.command.mockRejectedValueOnce(new Error('lost ack')).mockImplementation(async c=>({...completeAck(c),result:'alreadyApplied'}));await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).rejects.toThrow();await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).resolves.toMatchObject({result:'alreadyApplied'});expect(fixture.command.mock.calls[0]![0]).toEqual(fixture.command.mock.calls[1]![0]);fixture.command.mockRejectedValue(new ApiError(409,'REVISION_CONFLICT','changed'));await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).rejects.toMatchObject({code:'GIKA_RESCHEDULE_CONFLICT'});fixture.command.mockImplementation(async c=>({...completeAck(c),entityId:'wrong'}));await expect(executeReschedule(rescheduleTask,c,'account-a',new AbortController().signal)).rejects.toThrow();
 });
});
it('M4-T3 concurrent descriptor mismatch recovers only receipt once with ack still required',async()=>{
 const {confirmReschedule}=await import('../../apps/web/src/features/gika/rescheduleBridge');const {ApiError}=await import('../../apps/web/src/platform/api');fixture.request.mockResolvedValue({...response,rescheduleTask:{...rescheduleTask,revision:4}});fixture.command.mockRejectedValueOnce(new ApiError(409,'OPERATION_MISMATCH','Mismatch')).mockImplementationOnce(async c=>({...completeAck(c),result:'alreadyApplied'}));await expect(confirmReschedule(rescheduleTask,input,'account-a',new AbortController().signal)).resolves.toMatchObject({id:'target',revision:5,result:'alreadyApplied'});expect(fixture.request).toHaveBeenCalledTimes(1);expect(fixture.command).toHaveBeenCalledTimes(2);
});
