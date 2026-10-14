import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ state: [] as unknown[], index: 0, effects: [] as Array<() => unknown>, user: { uid: 'alice', emailVerified: true }, tokenChanged: null as null | ((user: unknown) => void), membership: null as null | ((snapshot: unknown) => void), api: vi.fn(), cache: vi.fn(), read: vi.fn(), clear: vi.fn(), purge: vi.fn(), context: null as unknown, account: vi.fn(), work: vi.fn() }));
vi.mock('react', () => ({ createContext: () => ({ Provider: 'provider' }), useCallback: (fn: unknown) => fn, useContext: () => undefined, useState: (initial: unknown) => { const i = h.index++; if (!(i in h.state)) h.state[i] = initial; return [h.state[i], (value: unknown) => { h.state[i] = value; }]; }, useRef: (value: unknown) => ({ current: value }), useEffect: (fn: () => unknown) => { h.effects.push(fn); } }));
vi.mock('firebase/auth', () => ({ onIdTokenChanged: (_auth: unknown, callback: (user: unknown) => void) => { h.tokenChanged = callback; return () => undefined; }, signOut: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: () => ({}), onSnapshot: (_doc: unknown, callback: (snapshot: unknown) => void) => { h.membership = callback; return () => undefined; } }));
vi.mock('../../apps/web/src/platform/firebase', () => ({ firebaseAuth: { get currentUser() { return h.user; } }, firestore: {}, activateOfflinePersistenceForAccount: vi.fn().mockResolvedValue(false), ensureFirestorePrivacy: vi.fn().mockResolvedValue(undefined), clearFirestorePersistence: h.purge }));
vi.mock('../../apps/web/src/platform/outbox', () => ({ cacheSession: h.cache, clearCachedSession: h.clear, readCachedSession: h.read, clearLocalData: vi.fn(), localWorkCounts: h.work, localWorkDescription: (work: { pending: number; drafts: number }) => `${work.pending} alteração pendente e ${work.drafts} rascunho` }));
vi.mock('../../apps/web/src/platform/notifications', () => ({ revokeNotificationDevice: vi.fn() }));
vi.mock('../../apps/web/src/platform/theme', () => ({ applyColorTheme: vi.fn(), applyAppearance: vi.fn(), storedAppearance: () => 'light' }));
vi.mock('../../apps/web/src/features/content/useLiveQueries', () => ({ clearQueryCache: vi.fn() }));
vi.mock('../../apps/web/src/platform/offlinePreference', () => ({ setOfflineAccount: h.account, cleanupWarning: () => 'cleanup failed', markCleanupFailure: vi.fn() }));
vi.mock('../../apps/web/src/platform/api', () => ({ ApiError: class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }, apiRequest: h.api }));
import { AuthProvider } from '../../apps/web/src/features/identity/AuthProvider';
import { ApiError } from '../../apps/web/src/platform/api';
const session = { uid: 'alice', membership: 'active', profile: { accountState: 'active' } };
function render(active = false) {
  if (active) { h.state[0] = h.user; h.state[1] = session; }
  const element = AuthProvider({ children: null });
  for (const effect of h.effects) effect();
  return element.props.value;
}
async function drain() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
beforeEach(() => { h.state = []; h.index = 0; h.effects = []; h.user = { uid: 'alice', emailVerified: true }; h.api.mockReset(); h.cache.mockReset().mockResolvedValue(undefined); h.read.mockReset().mockResolvedValue({ session }); h.clear.mockReset().mockResolvedValue(undefined); h.purge.mockReset().mockResolvedValue(true); h.account.mockReset(); h.work.mockReset().mockResolvedValue({ pending: 0, drafts: 0, fingerprint: 'empty' }); vi.stubGlobal('localStorage', { getItem: () => null }); vi.stubGlobal('navigator', { onLine: true }); vi.stubGlobal('window', { confirm: vi.fn(() => false), location: { reload: vi.fn() } }); });
afterEach(() => { vi.unstubAllGlobals(); });
it('authoritative membership revocation clears session before a failed refresh and never restores cached access', async () => {
  render(true); h.api.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'offline'));
  let release!: () => void; h.clear.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  h.membership!({ data: () => ({ state: 'revoked' }), metadata: { fromCache: false } });
  expect(h.state[1]).toBeNull(); expect(h.api).not.toHaveBeenCalled(); expect(h.clear).toHaveBeenCalledWith('alice');
  release(); await drain(); expect(h.api).toHaveBeenCalledOnce(); expect(h.read).not.toHaveBeenCalled(); expect(h.state[1]).toBeNull();
});
it('authorization denial invalidates offline session and a later network failure cannot recover it', async () => {
  const auth = render(); h.api.mockRejectedValueOnce(new ApiError(403, 'ACCESS_DENIED', 'revoked'));
  await auth.refresh(); expect(h.clear).toHaveBeenCalledWith('alice');
  h.api.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline')); await auth.refresh();
  expect(h.read).not.toHaveBeenCalled(); expect(h.state[1]).toBeNull();
});
it('session response arriving after account switch is neither cached nor displayed', async () => {
  const auth = render(); let respond!: (value: unknown) => void;
  h.api.mockImplementationOnce(() => new Promise(resolve => { respond = resolve; }));
  const refresh = auth.refresh(); await drain(); h.user = { uid: 'bob', emailVerified: true }; respond(session); await refresh;
  expect(h.cache).not.toHaveBeenCalled(); expect(h.state[1]).toBeNull();
});
it('account switch clears cached authorization and Firestore before permitting the next account', async () => {
  localStorage.getItem = () => 'alice'; render(true); h.user = { uid: 'bob', emailVerified: true }; h.tokenChanged!(h.user); await drain();
  expect(h.clear).toHaveBeenCalledWith('alice'); expect(h.purge).toHaveBeenCalledOnce(); expect(h.api).not.toHaveBeenCalled(); expect(h.account).toHaveBeenCalledWith('bob');
});
it('asks again when work changes after account deletion was confirmed', async () => {
  const auth = render(true); h.work.mockResolvedValue({ pending: 1, drafts: 0, fingerprint: 'new-work' });
  await auth.logout({ discardConfirmed: true, expectedFingerprint: 'confirmed-old-work' });
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('1 alteração pendente'));
  expect(h.clear).not.toHaveBeenCalled(); expect(h.purge).not.toHaveBeenCalled(); expect(h.state[1]).toEqual(session);
});
