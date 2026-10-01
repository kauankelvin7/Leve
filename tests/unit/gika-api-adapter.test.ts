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
const receipt = (command: ReturnType<typeof createTaskEnvelope>) => ({ operationId: command.operationId, entityId: command.entityId, revision: 1, serverTime: '2026-10-01T12:00:00Z', result: 'applied' });
describe('M3-T1 one existing command, structured success only after its acknowledgement', () => {
  it('valid creation uses software IDs/revision/defaults and a fresh authenticated command', async () => {
    fixture.request.mockResolvedValue(creation); fixture.command.mockImplementation(async command => receipt(command));
    const result = await createApiAdapter()({ ...input, text: 'Academia amanhã' }, new AbortController().signal);
    expect(result).toMatchObject({ text: 'Tarefa adicionada.', createdTask: { ...task, revision: 1, result: 'applied' } });
    expect(fixture.command).toHaveBeenCalledTimes(1);
    const [command, options] = fixture.command.mock.calls[0]!;
    expect(command).toMatchObject({ command: 'activity.create', expectedRevision: 0, payload: { title: 'Academia', reminderSpecs: [], schedule: { type: 'task', dueDate: task.dueDate, timeZone: task.timeZone } } });
    expect(command.operationId).not.toBe(input.requestId); expect(command.entityId).not.toBe(command.operationId);
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
  it('command failure does not confirm; minimal existing receipt envelope remains stable on manual retry', async () => {
    const adapter = createApiAdapter(); fixture.request.mockResolvedValue(creation); fixture.command.mockRejectedValueOnce(new Error('Command failed')).mockImplementationOnce(async command => receipt(command));
    await expect(adapter(input, new AbortController().signal)).rejects.toThrow('Command failed');
    await expect(adapter(input, new AbortController().signal)).resolves.toHaveProperty('createdTask');
    expect(fixture.request).toHaveBeenCalledTimes(1); expect(fixture.command.mock.calls[1]![0]).toEqual(fixture.command.mock.calls[0]![0]);
  });
  it('model narrative or forged createdTask is never command success', async () => {
    fixture.request.mockResolvedValue(response);
    await expect(createApiAdapter()(input, new AbortController().signal)).resolves.not.toHaveProperty('createdTask');
    fixture.request.mockResolvedValue({ ...response, createdTask: { ...task, id: 'fake', revision: 1, result: 'applied' } });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow(); expect(fixture.command).not.toHaveBeenCalled();
  });
  it('invalid or mismatched receipt and account change after dispatch never confirm', async () => {
    for (const value of [null, { result: 'applied' }, { ...receipt(createTaskEnvelope(task)), entityId: 'unrelated' }]) {
      fixture.request.mockResolvedValue(creation); fixture.command.mockResolvedValue(value);
      await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toThrow();
    }
    fixture.command.mockImplementation(async command => { fixture.user = null; return receipt(command); });
    await expect(createApiAdapter()(input, new AbortController().signal)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });
  it('bridge rejects a different command/payload before sendCommand', async () => {
    const envelope = createTaskEnvelope(task);
    for (const command of [{ ...envelope, command: 'activity.update' }, { ...envelope, payload: { ...(envelope.payload as Record<string, unknown>), title: 'Invented' } }]) {
      await expect(executeCreateTask(task, command, 'account-a', new AbortController().signal)).rejects.toThrow();
    }
    expect(fixture.command).not.toHaveBeenCalled();
  });
});
