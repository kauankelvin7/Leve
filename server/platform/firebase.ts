import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID não configurado.');
const emulated = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
if (emulated && (!projectId.startsWith('demo-') || process.env.VERCEL || process.env.NODE_ENV === 'production')) {
  throw new Error('Emuladores são permitidos apenas localmente em projetos demo-.');
}
if (emulated && !(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  throw new Error('Auth e Firestore devem usar emuladores juntos.');
}

const app = getApps()[0] ?? initializeApp({
  projectId,
  ...(emulated ? {} : {
    credential: process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL
      ? cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') })
      : applicationDefault(),
  }),
});

export const auth = getAuth(app);
export const db = getFirestore(app);
