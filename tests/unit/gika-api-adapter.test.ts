import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ user: { uid: 'account-a' } as { uid: string } | null, request: vi.fn() }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return fixture.user; } } }));
vi.mock('../../apps/web/src/platform/api', () => ({ apiRequest: fixture.request, ApiError: class extends Error { status: number; code: string; constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; } } }));
import { apiAdapter } from '../../apps/web/src/features/gika/apiAdapter';
const input = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'O que tenho hoje?' };
const response = { text: 'Veja sua agenda para o período consultado.', simulated: false, reads: [] };
beforeEach(() => { fixture.user = { uid: 'account-a' }; fixture.request.mockReset(); });
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
