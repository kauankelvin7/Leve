import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const harness = vi.hoisted(() => ({ drafts: new Map<string, unknown>(), sessions: new Map<string, unknown>(), persistenceClear: vi.fn(), terminate: vi.fn() }));
vi.mock('../../apps/web/src/platform/localData', () => ({
  DRAFT_STORE: 'drafts',
  SESSION_STORE: 'session-cache',
  localTransaction: async (name: string, _mode: string, run: (store: unknown, resolve: (value: unknown) => void, reject: (error: unknown) => void) => void) => new Promise(resolve => {
    const request = (result: unknown) => { const value = { result, onsuccess: null as null | (() => void) }; queueMicrotask(() => value.onsuccess?.()); return value; };
    if (name === 'session-cache') {
      const openCursor = () => {
        const entries = [...harness.sessions.entries()];
        let index = 0;
        const cursorRequest = {
          result: null as null | { value: unknown; delete: () => void; continue: () => void },
          onsuccess: null as null | (() => void),
          onerror: null as null | (() => void),
        };
        const advance = () => {
          if (index >= entries.length) {
            cursorRequest.result = null;
            cursorRequest.onsuccess?.();
            return;
          }
          const [key, value] = entries[index++]!;
          cursorRequest.result = {
            value,
            delete: () => { harness.sessions.delete(key); },
            continue: () => { queueMicrotask(advance); },
          };
          cursorRequest.onsuccess?.();
        };
        queueMicrotask(advance);
        return cursorRequest;
      };
      run({ openCursor, delete: (key: string) => { harness.sessions.delete(key); return request(undefined); } }, resolve, () => undefined);
      return;
    }
    run({ get: (key: string) => request(harness.drafts.get(key)), put: (record: { key: string }) => { harness.drafts.set(record.key, record); return request(undefined); }, delete: (key: string) => { harness.drafts.delete(key); return request(undefined); } }, resolve, () => undefined);
  }),
}));
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({ initializeAuth: () => ({}), browserLocalPersistence: {}, browserPopupRedirectResolver: {}, connectAuthEmulator: () => undefined }));
vi.mock('firebase/firestore', () => ({ getFirestore: () => ({}), initializeFirestore: () => ({}), clearIndexedDbPersistence: harness.persistenceClear, terminate: harness.terminate, connectFirestoreEmulator: () => undefined }));
function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key), key: (index: number) => [...entries.keys()][index] ?? null, get length() { return entries.size; } };
}
beforeEach(() => { vi.resetModules(); vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('window', { location: { hostname: 'localhost' } }); harness.drafts.clear(); harness.persistenceClear.mockReset().mockResolvedValue(undefined); harness.terminate.mockReset().mockResolvedValue(undefined); vi.stubEnv('VITE_USE_EMULATORS', 'true'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each([null, 'true', 'false'])('requires UID consent despite legacy switch %s', async legacy => {
  if (legacy !== null) localStorage.setItem('leve.offlineEnabled', legacy);
  const policy = await import('../../apps/web/src/platform/offlinePreference');
  policy.setOfflineAccount('alice'); expect(policy.offlineEnabled()).toBe(false);
  policy.setOfflinePreference('alice', true); expect(policy.offlineEnabled()).toBe(true);
  policy.setOfflineAccount('bob'); expect(policy.offlineEnabled()).toBe(false);
  policy.setOfflineAccount(null); expect(policy.offlineEnabled()).toBe(false);
});
it('reads legacy persistent drafts after migration without creating new private persistence', async () => {
  const policy = await import('../../apps/web/src/platform/offlinePreference'); policy.setOfflineAccount('alice');
  harness.drafts.set('alice:note', { key: 'alice:note', uid: 'alice', value: 'legacy private draft', updatedAt: '2020-01-01' });
  const drafts = await import('../../apps/web/src/platform/drafts');
  expect(await drafts.readDraft('alice', 'note')).toBe('legacy private draft');
  expect(await drafts.readDraft('bob', 'note')).toBeNull();
  await drafts.saveDraft('alice', 'note', 'newer temporary draft');
  expect(await drafts.readDraft('alice', 'note')).toBe('newer temporary draft');
  expect(harness.drafts.get('alice:note')).toMatchObject({ value: 'legacy private draft' });
  await drafts.removeDraft('alice', 'note'); expect(harness.drafts.size).toBe(0);
});
it('purges the old default Firestore cache even without any preference or UID marker', async () => {
  const firebase = await import('../../apps/web/src/platform/firebase'); await firebase.firestorePrivacyReady;
  expect(harness.persistenceClear).toHaveBeenCalledOnce();
  expect(localStorage.getItem('leve.offlinePrivacyMigration.v1')).toBe('done');
});
it('failed migration is uncompleted and remains visibly retryable', async () => {
  harness.persistenceClear.mockRejectedValueOnce(new Error('another tab owns persistence'));
  const firebase = await import('../../apps/web/src/platform/firebase'); await expect(firebase.firestorePrivacyReady).rejects.toThrow();
  expect(localStorage.getItem('leve.offlinePrivacyMigration.v1')).toBeNull();
  expect(localStorage.getItem('leve.offlineCleanupWarning')).toContain('Feche as outras abas');
});
it('cleanup cannot claim success on failure and preserves account preference', async () => {
  const policy = await import('../../apps/web/src/platform/offlinePreference'); policy.completeOfflineMigration(); policy.setOfflinePreference('alice', true); policy.setOfflineAccount('alice');
  const firebase = await import('../../apps/web/src/platform/firebase');
  harness.persistenceClear.mockRejectedValueOnce(new Error('blocked'));
  await expect(firebase.clearFirestorePersistence()).rejects.toThrow();
  expect(policy.offlineEnabled('alice')).toBe(true); expect(policy.cleanupWarning()).not.toBe('');
});
it('a cleanup warning causes startup retry even after the migration marker exists', async () => {
  const policy = await import('../../apps/web/src/platform/offlinePreference'); policy.completeOfflineMigration(); policy.markCleanupFailure();
  const firebase = await import('../../apps/web/src/platform/firebase'); await firebase.firestorePrivacyReady;
  expect(harness.persistenceClear).toHaveBeenCalledOnce(); expect(policy.cleanupWarning()).toBe('');
});
it('purges legacy session-cache rows without explicit account opt-in during privacy migration', async () => {
  const policy = await import('../../apps/web/src/platform/offlinePreference');
  policy.setOfflinePreference('opted-in-user', true);
  harness.sessions.set('legacy-user', { uid: 'legacy-user', session: { uid: 'legacy-user' } });
  harness.sessions.set('opted-in-user', { uid: 'opted-in-user', session: { uid: 'opted-in-user' } });
  const firebase = await import('../../apps/web/src/platform/firebase');
  await firebase.firestorePrivacyReady;
  expect(harness.sessions.has('legacy-user')).toBe(false);
  expect(harness.sessions.has('opted-in-user')).toBe(true);
});
