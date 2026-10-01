import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { confirmationPreviewSchema, gikaConfirmationSchema, reschedulePreview, type GikaConfirmation } from '../../packages/domain/src/gikaConfirmation.ts';
import type { RescheduleDescriptor } from '../../packages/domain/src/gikaReschedule.ts';
import type { CommandEnvelope } from '../../packages/domain/src/identity.ts';
import { hashCanonicalValue, hashValue } from '../hash.ts';
import { AppError } from '../errors.ts';

const namespace = 'leve:gika-confirmation:v1';
const lifetime = 15 * 60_000;
const claimSchema = z.object({ version: z.literal(1), uid: z.string().min(1).max(128), requestId: z.uuid(), requestTextHash: z.string().regex(/^[a-f0-9]{64}$/), preview: confirmationPreviewSchema, issuedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive() }).strict();
const invalid = () => new AppError(422, 'GIKA_CONFIRMATION_INVALID', 'Não consegui validar essa prévia. Faça o pedido novamente.');
// No conversation, pending-action storage or in-memory dedup. Randomness is only a local signing key.
const emulatorKey = randomBytes(32);
function signingKey() {
  const secret = process.env.SCHEDULER_HMAC_SECRET;
  if (secret) return createHmac('sha256', secret).update(namespace).digest();
  if (process.env.FIREBASE_PROJECT_ID?.startsWith('demo-') && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.VERCEL && process.env.NODE_ENV !== 'production') return emulatorKey;
  throw new AppError(503, 'GIKA_CONFIRMATION_UNAVAILABLE', 'Não consegui preparar a confirmação agora. Sua agenda continua disponível.');
}
export function createConfirmationSigner(key: Uint8Array, now: () => number = Date.now) {
  const signature = (encoded: string) => createHmac('sha256', key).update(`${namespace}.${encoded}`).digest('hex');
  return {
    issue(uid: string, request: { requestId: string; text: string }, task: RescheduleDescriptor, policy: unknown): GikaConfirmation {
      const preview = reschedulePreview(task, policy), issuedAt = now();
      const claims = claimSchema.parse({ version: 1, uid, requestId: request.requestId, requestTextHash: hashValue(request.text.trim()), preview, issuedAt, expiresAt: issuedAt + lifetime });
      const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
      return gikaConfirmationSchema.parse({ ...preview, token: `${encoded}.${signature(encoded)}` });
    },
    verify(uid: string, command: CommandEnvelope): GikaConfirmation {
      const token = command.gikaReschedule?.confirmationToken;
      if (!token || token.length > 8192 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) throw invalid();
      const [encoded, supplied] = token.split('.') as [string, string];
      if (!timingSafeEqual(Buffer.from(signature(encoded), 'hex'), Buffer.from(supplied, 'hex'))) throw invalid();
      let claims;
      try { claims = claimSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))); } catch { throw invalid(); }
      if (claims.uid !== uid || claims.requestId !== command.operationId || claims.requestTextHash !== command.gikaReschedule?.requestTextHash) throw invalid();
      if (claims.issuedAt > now() || claims.expiresAt - claims.issuedAt !== lifetime || claims.expiresAt <= now()) throw new AppError(409, 'GIKA_CONFIRMATION_EXPIRED', 'Essa prévia expirou. Faça o pedido novamente.');
      const task = claims.preview.action.task;
      if (command.command !== 'activity.update' || task.id !== command.entityId || task.revision !== command.expectedRevision || hashCanonicalValue(task.patch) !== hashCanonicalValue(command.payload)) throw invalid();
      return gikaConfirmationSchema.parse({ ...claims.preview, token });
    },
  };
}
export const issueConfirmation = (uid: string, request: { requestId: string; text: string }, task: RescheduleDescriptor, policy: unknown) => createConfirmationSigner(signingKey()).issue(uid, request, task, policy);
export const verifyConfirmation = (uid: string, command: CommandEnvelope) => createConfirmationSigner(signingKey()).verify(uid, command);
