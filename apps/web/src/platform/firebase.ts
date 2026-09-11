import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

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
export const firebaseAuth = app ? (reusedApp ? getAuth(app) : initializeAuth(app, { persistence: browserLocalPersistence })) : null;
export const firestore = app ? getFirestore(app) : null;
export const emulatorMode = useEmulators;
const emulatorConnections = globalThis as typeof globalThis & { __leveFirebaseEmulatorsConnected?: boolean };
if (useEmulators && firebaseAuth && firestore && !emulatorConnections.__leveFirebaseEmulatorsConnected) {
  if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) throw new Error('Emuladores limitados ao ambiente local.');
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  emulatorConnections.__leveFirebaseEmulatorsConnected = true;
}
