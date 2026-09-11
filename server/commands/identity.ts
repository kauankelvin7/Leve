import { createHash, timingSafeEqual } from 'node:crypto';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { acceptInviteSchema, profilePreferencesSchema, type CommandEnvelope, type CommandResult, type UserProfile } from '../../packages/domain/src/identity';
import { db } from '../platform/firebase';
import { AppError } from '../errors';

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}

export function commandHash(command: CommandEnvelope): string {
  return hashValue(canonical(command));
}

export async function acceptInvite(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const input = acceptInviteSchema.parse(command.payload);
  if (!identity.email_verified || !identity.email) throw new AppError(403, 'EMAIL_UNVERIFIED', 'Confirme seu e-mail antes de continuar.');
  const verifiedEmail = identity.email.trim().toLowerCase();
  if (command.entityId !== identity.uid) throw new AppError(403, 'FORBIDDEN', 'Não foi possível concluir esta operação.');
  const now = new Date().toISOString();
  const digest = commandHash(command);
  const memberRef = db.doc(`memberships/${identity.uid}`);
  const profileRef = db.doc(`users/${identity.uid}`);
  const inviteRef = db.doc(`invites/${input.inviteId}`);
  const controlsRef = db.doc('serviceControls/global');
  const receiptRef = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  return db.runTransaction(async transaction => {
    const [member, profile, invite, controls, receipt] = await transaction.getAll(memberRef, profileRef, inviteRef, controlsRef, receiptRef);
    if (member?.data()?.state === 'suspended' || profile?.data()?.accountState === 'deleting') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (receipt?.exists) {
      if (receipt.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...receipt.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (member?.data()?.state === 'active' && profile?.exists) return { operationId: command.operationId, entityId: identity.uid, revision: profile.data()!.revision, serverTime: now, result: 'alreadyApplied' };
    const settings = controls?.data();
    if (!settings?.admissionsOpen || settings.registeredAccounts >= settings.accountLimit || settings.mode !== 'normal') throw new AppError(403, 'ADMISSIONS_CLOSED', 'Novos acessos estão temporariamente fechados.');
    const invitation = invite?.data();
    const supplied = Buffer.from(hashValue(input.secret), 'hex');
    const stored = Buffer.from(typeof invitation?.secretHash === 'string' ? invitation.secretHash : '', 'hex');
    if (!invitation || invitation.state !== 'pending' || invitation.expiresAt <= now || stored.length !== supplied.length || !timingSafeEqual(stored, supplied) || (invitation.email && String(invitation.email).trim().toLowerCase() !== verifiedEmail)) {
      throw new AppError(403, 'INVITE_INVALID', 'Convite inválido, indisponível ou vencido.');
    }
    const user: UserProfile = { ...input.profile, uid: identity.uid, schemaVersion: 1, revision: 1, dataVersion: 1, accountState: 'active', createdAt: now, updatedAt: now };
    const response: CommandResult = { operationId: command.operationId, entityId: identity.uid, revision: 1, serverTime: now, result: 'applied' };
    transaction.create(profileRef, user);
    transaction.create(memberRef, { state: 'active', createdAt: now, inviteId: input.inviteId });
    transaction.update(inviteRef, { state: 'consumed', consumedBy: identity.uid, consumedAt: now });
    transaction.update(controlsRef, { registeredAccounts: settings.registeredAccounts + 1 });
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
    transaction.update(profileRef, { ...preferences, revision, dataVersion: profile!.data()!.dataVersion + 1, updatedAt: now });
    transaction.create(receiptRef, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.set(minute!.ref, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
    transaction.set(day!.ref, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    return response;
  });
}
