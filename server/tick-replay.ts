import { AppError } from './errors.ts';
import { hashValue } from './hash.ts';
import { db } from './platform/firebase.ts';
import { TICK_VALIDITY_MS } from './tick-signature.ts';

// The scheduler normally sends one tick per minute. Bound one stable document
// rather than creating unbounded nonce documents or requiring paid TTL cleanup.
export const MAX_TICK_REPLAY_CLAIMS = 128;
type Claim = { digest: string; validUntilMs: number };

/** Call only after HMAC verification, and reserve before starting any jobs. */
export async function claimTickReplay(verified: { timestamp: string; signature: string; milliseconds: number }, now?: number) {
  const digest = hashValue(`${verified.timestamp}.${verified.signature}`);
  const stateRef = db.doc('maintenance/internalTickReplay');
  await db.runTransaction(async transaction => {
    const claimTime = now ?? Date.now();
    if (Math.abs(claimTime - verified.milliseconds) > TICK_VALIDITY_MS) throw new AppError(401, 'AUTH_REQUIRED', 'Assinatura expirada.');
    const state = await transaction.get(stateRef);
    const stored = state.data()?.claims;
    if (state.exists && (!Array.isArray(stored) || stored.length > MAX_TICK_REPLAY_CLAIMS || stored.some(claim => !claim || !/^[a-f0-9]{64}$/.test(claim.digest) || !Number.isSafeInteger(claim.validUntilMs)))) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Serviço indisponível. Tente novamente mais tarde.');
    }
    // Inclusive signature validity: a claim at its final millisecond still
    // blocks replay. Future timestamps remain reserved for their full window.
    const active = ((stored ?? []) as Claim[]).filter(claim => claim.validUntilMs >= claimTime);
    if (active.some(claim => claim.digest === digest)) throw new AppError(409, 'TICK_REPLAY', 'Esta execução já foi recebida.');
    if (active.length >= MAX_TICK_REPLAY_CLAIMS) throw new AppError(429, 'TICK_CAPACITY', 'O limite de execuções foi atingido por agora.');
    transaction.set(stateRef, { claims: [...active, { digest, validUntilMs: verified.milliseconds + TICK_VALIDITY_MS }] });
  });
}
