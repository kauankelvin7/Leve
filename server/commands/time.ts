import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { civilDateSchema, timeEntryManualInputSchema, timeEntrySessionInputSchema } from '../../packages/domain/src/content.ts';
import { timeZoneSchema, type CommandEnvelope, type CommandResult } from '../../packages/domain/src/identity.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { commandHash } from './identity.ts';

const startSchema = z.object({ activityId: z.string().min(1).max(128), civilDate: civilDateSchema, timeZone: timeZoneSchema }).strict();
const emptySchema = z.object({}).strict();

export async function timeEntryCommand(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
  const action = command.command.split('.')[1];
  if (!['start', 'stop', 'addManual', 'addSession', 'trash'].includes(action ?? '')) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
  const input: Record<string, any> = action === 'start' ? startSchema.parse(command.payload) : action === 'addManual' ? timeEntryManualInputSchema.parse(command.payload) : action === 'addSession' ? timeEntrySessionInputSchema.parse(command.payload) : emptySchema.parse(command.payload);
  if (action === 'addSession' && command.entityId !== input.sessionId) throw new AppError(422, 'VALIDATION_ERROR', 'A sessão não pôde ser identificada.');
  const root = db.doc(`users/${identity.uid}`);
  const target = root.collection('timeEntries').doc(command.entityId);
  const activeRef = root.collection('internal').doc('activeTimer');
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const now = new Date().toISOString();
  const digest = commandHash(command);

  return db.runTransaction(async transaction => {
    const activityRef = action === 'start' || action === 'addManual' || action === 'addSession' ? root.collection('activities').doc(String(input.activityId)) : null;
    const refs = [root, db.doc(`memberships/${identity.uid}`), receiptRef, target, activeRef, ...(activityRef ? [activityRef] : [])];
    const [profile, membership, receipt, current, active, activity] = await transaction.getAll(...refs);
    if (membership?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (activityRef && (!activity?.exists || activity.data()?.deletedAt)) throw new AppError(422, 'REFERENCE_UNAVAILABLE', 'A atividade não está disponível.');
    const existing = current?.data();
    const activeId = active?.data()?.entryId;
    let revision = 1;
    if (action === 'start') {
      if (command.expectedRevision !== 0 || current?.exists) throw new AppError(409, 'REVISION_CONFLICT', 'Este registro de tempo já existe.');
      if (activeId) throw new AppError(409, 'TIMER_ALREADY_RUNNING', 'Já existe um cronômetro em andamento. Pare-o antes de iniciar outro.');
      transaction.create(target, { ...input, startedAt: now, endedAt: null, durationSeconds: 0, source: 'timer', revision, schemaVersion: 1, deletedAt: null, createdAt: now, updatedAt: now });
      transaction.set(activeRef, { entryId: command.entityId, activityId: input.activityId, startedAt: now, updatedAt: now });
    } else if (action === 'addManual' || action === 'addSession') {
      if (command.expectedRevision !== 0 || current?.exists) throw new AppError(409, 'REVISION_CONFLICT', 'Este registro de tempo já existe.');
      const startedAt = new Date(Date.parse(now) - input.durationSeconds * 1000).toISOString();
      transaction.create(target, { ...input, sessionId: input.sessionId ?? command.entityId, startedAt, endedAt: now, source: action === 'addSession' ? 'session' : 'manual', revision, schemaVersion: 1, deletedAt: null, createdAt: now, updatedAt: now });
    } else {
      if (!current?.exists || !existing || existing.deletedAt) throw new AppError(409, 'ENTITY_UNAVAILABLE', 'Este registro de tempo não está disponível.');
      if (existing.revision !== command.expectedRevision) throw new AppError(409, 'REVISION_CONFLICT', 'Este registro mudou em outra sessão.');
      revision = existing.revision + 1;
      if (action === 'stop') {
        if (existing.endedAt) throw new AppError(409, 'TIMER_NOT_RUNNING', 'Este cronômetro já foi encerrado.');
        const durationSeconds = Math.max(1, Math.round((Date.parse(now) - Date.parse(existing.startedAt)) / 1000));
        transaction.update(target, { endedAt: now, durationSeconds, revision, updatedAt: now });
        if (activeId === command.entityId) transaction.delete(activeRef);
      } else {
        transaction.update(target, { deletedAt: now, purgeAfter: new Date(Date.now() + 30 * 86400_000).toISOString(), revision, updatedAt: now });
      }
    }
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision, serverTime: now, result: 'applied' };
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.update(root, { dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    return response;
  });
}
