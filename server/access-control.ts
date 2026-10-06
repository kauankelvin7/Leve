import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from './platform/firebase.ts';
import { AppError } from './errors.ts';

/** Admin SDK calls bypass Firestore Rules, so private HTTP routes must repeat the
 * same account and membership checks explicitly. */
export async function requireActiveVerifiedAccount(identity: DecodedIdToken) {
  if (identity.email_verified !== true) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
  const [profile, membership] = await db.getAll(db.doc(`users/${identity.uid}`), db.doc(`memberships/${identity.uid}`));
  if (profile?.data()?.accountState !== 'active' || membership?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
  return { profile, membership };
}
