import type { DecodedIdToken } from 'firebase-admin/auth';
import { accountActivationSchema, profilePreferencesSchema, type CommandEnvelope, type CommandResult, type UserProfile } from '../../packages/domain/src/identity.ts';
import { db } from '../platform/firebase.ts';
import { AppError } from '../errors.ts';
import { hashCanonicalValue } from '../hash.ts';

export function commandHash(command: CommandEnvelope): string {
  return hashCanonicalValue(command);
}

export async function completeTutorial(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  if (command.entityId !== identity.uid || !identity.email_verified) throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
  const now = new Date().toISOString();
  return db.runTransaction(async transaction => {
    const root = db.doc(`users/${identity.uid}`);
    const [profile, member] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`));
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    const data = profile.data()!;
    if (!data.tutorialCompletedAt) transaction.update(root, { tutorialCompletedAt: now, dataVersion: (data.dataVersion ?? 0) + 1 });
    return { operationId: command.operationId, entityId: identity.uid, revision: data.revision, serverTime: now, result: data.tutorialCompletedAt ? 'alreadyApplied' : 'applied' };
  });
}

export async function activateAccount(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const input = accountActivationSchema.parse(command.payload);
  if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail antes de continuar.');
  if (command.entityId !== identity.uid) throw new AppError(403, 'FORBIDDEN', 'Não foi possível concluir esta operação.');
  const now = new Date().toISOString();
  const digest = commandHash(command);
  const memberRef = db.doc(`memberships/${identity.uid}`);
  const profileRef = db.doc(`users/${identity.uid}`);
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  return db.runTransaction(async transaction => {
    const [member, profile, receipt] = await transaction.getAll(memberRef, profileRef, receiptRef);
    if (member?.data()?.state === 'suspended' || profile?.data()?.accountState === 'deleting') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (member?.data()?.state === 'active' && profile?.exists) return { operationId: command.operationId, entityId: identity.uid, revision: profile.data()!.revision, serverTime: now, result: 'alreadyApplied' };
    const user: UserProfile = { ...input.profile, seasonalDetailsEnabled: input.profile.seasonalDetailsEnabled ?? true, timeZone: 'America/Sao_Paulo', uid: identity.uid, schemaVersion: 1, revision: 1, dataVersion: 1, accountState: 'active', createdAt: now, updatedAt: now };
    const response: CommandResult = { operationId: command.operationId, entityId: identity.uid, revision: 1, serverTime: now, result: 'applied' };
    transaction.create(profileRef, user);
    transaction.create(memberRef, { state: 'active', createdAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    const defaults = [ ['estudos', 'Estudos', '#A08AC2'], ['pessoal', 'Pessoal', '#D6A283'], ['saude', 'Saúde', '#86A5C6'], ['casa', 'Casa & compras', '#8EAA8E'] ];
    defaults.forEach(([id, name, colorHex], sortOrder) => transaction.create(profileRef.collection('categories').doc(id!), { name, normalizedName: name!.toLocaleLowerCase('pt-BR'), colorHex, sortOrder, archivedAt: null, deletedAt: null, revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now }));
    transaction.create(profileRef.collection('internal').doc('counts'), { activities: 0, notes: 0, shoppingLists: 0, categories: 4, series: 0, notificationDevices: 0 });
    return response;
  });
}

export async function updateProfile(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const preferences = profilePreferencesSchema.parse(command.payload);
  if (!identity.email_verified) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail para continuar.');
  if (command.entityId !== identity.uid) throw new AppError(403, 'FORBIDDEN', 'Não foi possível concluir esta operação.');
  const now = new Date().toISOString();
  const digest = commandHash(command);
  return db.runTransaction(async transaction => {
    const profileRef = db.doc(`users/${identity.uid}`);
    const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
    const [profile, member, receipt, controls, minute, day] = await transaction.getAll(profileRef, db.doc(`memberships/${identity.uid}`), receiptRef, db.doc('serviceControls/global'), db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`), db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`));
    if (member?.data()?.state !== 'active' || profile?.data()?.accountState !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (controls?.data()?.mode === 'restricted') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Seu rascunho foi preservado.');
    if ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');
    if (command.expectedRevision !== profile!.data()!.revision) throw new AppError(409, 'REVISION_CONFLICT', 'Seu perfil mudou em outra sessão. Recarregue antes de salvar.', { current: profile!.data() });
    const revision = profile!.data()!.revision + 1;
    const response: CommandResult = { operationId: command.operationId, entityId: identity.uid, revision, serverTime: now, result: 'applied' };
    transaction.update(profileRef, { ...preferences, seasonalDetailsEnabled: preferences.seasonalDetailsEnabled ?? profile!.data()!.seasonalDetailsEnabled ?? true, timeZone: profile!.data()!.timeZone ?? 'America/Sao_Paulo', revision, dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.set(minute!.ref, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(day!.ref, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}