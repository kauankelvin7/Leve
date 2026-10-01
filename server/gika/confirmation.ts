import { recurrenceProposalSchema, recurrenceChoiceSchema, recurrenceEffectSchema, recurrenceConfirmationSchema, recurrenceCommandFields, type RecurrenceProposal, type RecurrenceChoice, type RecurrenceEffect, type RecurrenceConfirmation } from '../../packages/domain/src/gikaRecurrence.ts';
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
const recurrenceClaimsSchema = z.discriminatedUnion('purpose', [
  z.object({ version: z.literal(2), purpose: z.literal('recurrence_choice'), uid: z.string().min(1).max(128), requestId: z.uuid(), requestTextHash: z.string().regex(/^[a-f0-9]{64}$/), proposal: recurrenceProposalSchema, options: z.array(z.enum(['occurrence', 'future'])).min(1).max(2), issuedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive() }).strict(),
  z.object({ version: z.literal(2), purpose: z.literal('recurrence_confirmation'), uid: z.string().min(1).max(128), requestId: z.uuid(), requestTextHash: z.string().regex(/^[a-f0-9]{64}$/), effect: recurrenceEffectSchema, issuedAt: z.number().int().nonnegative(), expiresAt: z.number().int().positive() }).strict(),
]);
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
  const seal = (claims: unknown) => { const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url'); return `${encoded}.${signature(encoded)}`; };
  const recurrenceClaims = (uid: string, requestId: string, requestTextHash: string, token: string) => {
    if (token.length > 8192 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) throw invalid();
    const [encoded, supplied] = token.split('.') as [string, string];
    if (!timingSafeEqual(Buffer.from(signature(encoded), 'hex'), Buffer.from(supplied, 'hex'))) throw invalid();
    let claims;
    try { claims = recurrenceClaimsSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))); } catch { throw invalid(); }
    if (claims.uid !== uid || claims.requestId !== requestId || claims.requestTextHash !== requestTextHash) throw invalid();
    if (claims.issuedAt > now() || claims.expiresAt - claims.issuedAt !== lifetime || claims.expiresAt <= now()) throw new AppError(409, 'GIKA_CONFIRMATION_EXPIRED', 'Essa prévia expirou. Faça o pedido novamente.');
    return claims;
  };
  return {
    issueRecurrenceChoice(uid: string, request: { requestId: string; text: string }, proposal: RecurrenceProposal): RecurrenceChoice {
      const options: ('occurrence' | 'future')[] = ['occurrence'];
      if (proposal.operation !== 'complete' && proposal.recurrence.futureAllowed) options.push('future');
      const issuedAt = now();
      const claims = recurrenceClaimsSchema.parse({ version: 2, purpose: 'recurrence_choice', uid, requestId: request.requestId, requestTextHash: hashValue(request.text.trim()), proposal, options, issuedAt, expiresAt: issuedAt + lifetime });
      return recurrenceChoiceSchema.parse({ proposal, options, token: seal(claims) });
    },
    verifyRecurrenceChoice(uid: string, request: { requestId: string; text: string }, token: string): RecurrenceChoice {
      const claims = recurrenceClaims(uid, request.requestId, hashValue(request.text.trim()), token);
      if (claims.purpose !== 'recurrence_choice') throw invalid();
      return recurrenceChoiceSchema.parse({ proposal: claims.proposal, options: claims.options, token });
    },
    issueRecurrenceConfirmation(uid: string, request: { requestId: string; text: string }, effect: RecurrenceEffect, sourceChoiceToken?: string): RecurrenceConfirmation {
      let issuedAt = now();
      if (sourceChoiceToken) {
        const choice = recurrenceClaims(uid, request.requestId, hashValue(request.text.trim()), sourceChoiceToken);
        const { scope, newSeriesId: _newSeriesId, ...proposal } = effect;
        if (choice.purpose !== 'recurrence_choice' || !choice.options.includes(scope) || hashCanonicalValue(choice.proposal) !== hashCanonicalValue(proposal)) throw invalid();
        issuedAt = choice.issuedAt;
      }
      const claims = recurrenceClaimsSchema.parse({ version: 2, purpose: 'recurrence_confirmation', uid, requestId: request.requestId, requestTextHash: hashValue(request.text.trim()), effect, issuedAt, expiresAt: issuedAt + lifetime });
      return recurrenceConfirmationSchema.parse({ effect, policy: { kind: 'confirm', risk: effect.scope === 'future' ? 'high' : 'medium', reason: 'RECURRENCE_PREVIEW_REQUIRED' }, token: seal(claims) });
    },
    verifyRecurrenceConfirmation(uid: string, command: CommandEnvelope): RecurrenceEffect {
      const metadata = command.gikaRecurrence;
      if (!metadata) throw invalid();
      const claims = recurrenceClaims(uid, command.operationId, metadata.requestTextHash, metadata.confirmationToken);
      if (claims.purpose !== 'recurrence_confirmation') throw invalid();
      const expected = recurrenceCommandFields(claims.effect);
      if (command.command !== expected.command || command.entityId !== expected.entityId || command.expectedRevision !== expected.expectedRevision || hashCanonicalValue(command.payload) !== hashCanonicalValue(expected.payload)) throw invalid();
      return claims.effect;
    },
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

export const issueRecurrenceChoice = (uid: string, request: { requestId: string; text: string }, proposal: RecurrenceProposal) => createConfirmationSigner(signingKey()).issueRecurrenceChoice(uid, request, proposal);
export const verifyRecurrenceChoice = (uid: string, request: { requestId: string; text: string }, token: string) => createConfirmationSigner(signingKey()).verifyRecurrenceChoice(uid, request, token);
export const issueRecurrenceConfirmation = (uid: string, request: { requestId: string; text: string }, effect: RecurrenceEffect, sourceChoiceToken?: string) => createConfirmationSigner(signingKey()).issueRecurrenceConfirmation(uid, request, effect, sourceChoiceToken);
export const verifyRecurrenceConfirmation = (uid: string, command: CommandEnvelope) => createConfirmationSigner(signingKey()).verifyRecurrenceConfirmation(uid, command);
