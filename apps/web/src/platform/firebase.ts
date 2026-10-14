import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { applyActionCode, browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getAuth, initializeAuth } from 'firebase/auth';
import { clearIndexedDbPersistence, connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate } from 'firebase/firestore';
import { offlineEnabled, offlineMigrationRequired, completeOfflineMigration, markCleanupFailure, clearCleanupWarning, cacheCleanupRequired } from './offlinePreference';

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
const config = useEmulators ? {
  apiKey: 'local-emulator-key', authDomain: 'localhost', projectId: 'demo-leve', appId: 'leve-local',
} : {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const configured = Boolean(config.apiKey && config.projectId && config.appId && config.authDomain);
const reusedApp = getApps().length > 0;
const app = configured ? (reusedApp ? getApp() : initializeApp(config)) : null;
export const firebaseApp = app;
export const firebaseAuth = app ? (reusedApp ? getAuth(app) : initializeAuth(app, { persistence: browserLocalPersistence, popupRedirectResolver: browserPopupRedirectResolver })) : null;
const OFFLINE_ACTIVATION_ATTEMPT = 'leve.offlineActivationAttempt';
let offlinePersistenceActive = false;
function createFirestore(instance: FirebaseApp) {
  if (!offlineEnabled() || offlineMigrationRequired() || cacheCleanupRequired()) return getFirestore(instance);
  try {
    const database = initializeFirestore(instance, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    offlinePersistenceActive = true;
    return database;
  } catch {
    // Some browsers (private mode or a restricted WebView) do not expose a
    // usable IndexedDB. The agenda must still open online in that case.
    return getFirestore(instance);
  }
}
export const firestore = app ? (reusedApp ? getFirestore(app) : createFirestore(app)) : null;
if (offlinePersistenceActive) { try { sessionStorage.removeItem(OFFLINE_ACTIVATION_ATTEMPT); } catch { /* Storage may be unavailable in a restricted browser. */ } }
export const emulatorMode = useEmulators;
const emulatorConnections = globalThis as typeof globalThis & { __leveFirebaseEmulatorsConnected?: boolean };
if (useEmulators && firebaseAuth && firestore && !emulatorConnections.__leveFirebaseEmulatorsConnected) {
  if (!['localhost', 'localhost'].includes(window.location.hostname)) throw new Error('Emuladores limitados ao ambiente local.');
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  emulatorConnections.__leveFirebaseEmulatorsConnected = true;
}

/** Before any Firestore query, remove the legacy cache even when no preference
 * or UID marker exists: older clients persisted by default in that case. */
async function migrateFirestorePrivacy() {
  if (!firestore || (!offlineMigrationRequired() && !cacheCleanupRequired())) return;
  try { await clearIndexedDbPersistence(firestore); completeOfflineMigration(); clearCleanupWarning(); }
  catch (failure) { markCleanupFailure(); throw failure; }
}
export const firestorePrivacyReady = migrateFirestorePrivacy();
export async function ensureFirestorePrivacy() {
  try { await firestorePrivacyReady; } catch { /* Closing another tab permits a retry without a new login. */ }
  await migrateFirestorePrivacy();
}

/** A returning user may have opted in before logout. The first Firestore
 * instance was created before Firebase restored that user's identity, so
 * restart once after recording the UID; the next page load can safely enable
 * persistence from that account's preference. A one-reload guard handles
 * browsers where persistent IndexedDB is unavailable. */
export async function activateOfflinePersistenceForAccount(uid: string) {
  if (!firestore || !offlineEnabled(uid) || offlinePersistenceActive) return false;
  try {
    // On upgraded installs the migration has to finish before a reload can
    // initialize persistent Firestore; otherwise this one-shot restart would
    // consume its guard while still using the memory-only instance.
    await ensureFirestorePrivacy();
    if (sessionStorage.getItem(OFFLINE_ACTIVATION_ATTEMPT) === uid) {
      sessionStorage.removeItem(OFFLINE_ACTIVATION_ATTEMPT);
      return false;
    }
    sessionStorage.setItem(OFFLINE_ACTIVATION_ATTEMPT, uid);
    await terminate(firestore);
    window.location.reload();
    return true;
  } catch {
    try { sessionStorage.removeItem(OFFLINE_ACTIVATION_ATTEMPT); } catch { /* Storage may be unavailable in a restricted browser. */ }
    return false;
  }
}
// Keep the failure handled until AuthProvider consumes it.
void firestorePrivacyReady.catch(() => undefined);

/** Do not swallow cleanup errors or report success while private data remains. */
export async function clearFirestorePersistence() {
  if (!firestore) return false;
  try {
    await terminate(firestore);
    await clearIndexedDbPersistence(firestore);
    completeOfflineMigration(); clearCleanupWarning();
    return true;
  } catch (failure) { markCleanupFailure(); throw failure; }
}

export async function completeLocalEmailVerification(email: string) {
  if (!useEmulators || !firebaseAuth || !['localhost', 'localhost'].includes(window.location.hostname)) throw new Error('Local verification unavailable.');
  const response = await fetch('http://localhost:9099/emulator/v1/projects/demo-leve/oobCodes');
  if (!response.ok) throw new Error('Unable to read local verification codes.');
  const result = await response.json() as { oobCodes?: Array<{ email?: string; oobCode?: string; requestType?: string }> };
  const verification = [...(result.oobCodes ?? [])].reverse().find(code => code.email === email && code.requestType === 'VERIFY_EMAIL' && code.oobCode);
  if (!verification?.oobCode) throw new Error('Local verification code not found.');
  await applyActionCode(firebaseAuth, verification.oobCode);
}
