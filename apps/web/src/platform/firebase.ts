import { getApp, getApps, initializeApp } from 'firebase/app';
import { applyActionCode, browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, getAuth, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { offlineEnabled } from './outbox';

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
export const firestore = app ? (reusedApp ? getFirestore(app) : initializeFirestore(app, offlineEnabled() ? { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) } : {})) : null;
export const emulatorMode = useEmulators;
const emulatorConnections = globalThis as typeof globalThis & { __leveFirebaseEmulatorsConnected?: boolean };
if (useEmulators && firebaseAuth && firestore && !emulatorConnections.__leveFirebaseEmulatorsConnected) {
  if (!['localhost', 'localhost'].includes(window.location.hostname)) throw new Error('Emuladores limitados ao ambiente local.');
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  emulatorConnections.__leveFirebaseEmulatorsConnected = true;
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
