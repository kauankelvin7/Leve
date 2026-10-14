import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DocumentReference } from 'firebase-admin/firestore';
import { notificationDeviceSchema, notificationRevokeSchema } from '../../packages/domain/src/notifications.ts';
import type { CommandEnvelope, CommandResult } from '../../packages/domain/src/identity.ts';
import { AppError } from '../errors.ts';
import { db } from '../platform/firebase.ts';
import { commandHash } from './identity.ts';
import { hashValue } from '../hash.ts';
import { requireActiveVerifiedAccount } from '../access-control.ts';

export async function notificationCommand(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const action = command.command.split('.')[1];
  if (!['register', 'revoke'].includes(action ?? '')) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
  if (action === 'register') await requireActiveVerifiedAccount(identity);
  const input = action === 'register' ? notificationDeviceSchema.parse(command.payload) : notificationRevokeSchema.parse(command.payload);
  const root = db.doc(`users/${identity.uid}`);
  const target = db.doc(`notificationDevices/${identity.uid}_${command.entityId}`);
  const tokenTarget = db.doc(`notificationTokens/${identity.uid}_${command.entityId}`);
  const receipt = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const minuteRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 16)}`);
  const dayRef = db.doc(`usageBuckets/${identity.uid}_${now.slice(0, 10)}`);
  const digest = commandHash(command);
  const registration = action === 'register' ? input as { token: string; platform: 'web'; label: string } : null;
  const tokenHash = registration ? hashValue(registration.token) : null;
  const ownerRef = tokenHash ? db.doc(`notificationTokenOwners/${tokenHash}`) : null;

  return db.runTransaction(async transaction => {
    const [profile, member, previous, device, counts, controls, minute, day] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), receipt, target, countsRef, db.doc('serviceControls/global'), minuteRef, dayRef);
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (previous?.exists) {
      if (previous.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...previous.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    if (registration && controls?.data()?.mode !== 'normal') throw new AppError(503, 'SERVICE_RESTRICTED', 'Serviço temporariamente restrito. Sua agenda continua disponível.');
    if (registration && ((minute?.data()?.count ?? 0) >= 60 || (day?.data()?.count ?? 0) >= 1000)) throw new AppError(429, 'LIMIT_EXCEEDED', 'Limite de alterações atingido. Tente mais tarde.');

    // A shared hash-keyed document serializes two accounts registering a token
    // that had no owner at the start. Refresh legacy owners inside every retry.
    if (ownerRef) await transaction.get(ownerRef);
    const legacyOwners = registration ? await transaction.get(db.collection('notificationTokens').where('token', '==', registration.token).limit(11)) : null;
    if (legacyOwners && legacyOwners.size > 10) throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Serviço indisponível. Tente novamente mais tarde.');
    const previousTokenDocs = legacyOwners?.docs.filter(record => record.data().state === 'active' && record.id !== tokenTarget.id) ?? [];
    const previousRefs = previousTokenDocs.flatMap(record => [db.doc(`notificationDevices/${record.data().uid}_${record.data().deviceId}`), db.doc(`users/${record.data().uid}/internal/counts`)]);
    const previousSnapshots = previousRefs.length ? await transaction.getAll(...previousRefs) : [];
    const priorHash = device?.data()?.tokenHash;
    const priorOwnerRef = typeof priorHash === 'string' && /^[a-f0-9]{64}$/.test(priorHash) && (action === 'revoke' || priorHash !== tokenHash)
      ? db.doc(`notificationTokenOwners/${priorHash}`) : null;
    const priorOwner = priorOwnerRef ? await transaction.get(priorOwnerRef) : null;
    const reclaimedCounts = new Map<string, { ref: DocumentReference; current: number; amount: number }>();
    for (let index = 0; index < previousTokenDocs.length; index++) {
      const record = previousTokenDocs[index]!;
      const oldDevice = previousSnapshots[index * 2];
      const oldCounts = previousSnapshots[index * 2 + 1];
      if (oldDevice?.data()?.state === 'active' && oldDevice.data()?.tokenHash === tokenHash && oldCounts) {
        const uid = String(record.data().uid);
        if (!reclaimedCounts.has(uid)) reclaimedCounts.set(uid, { ref: oldCounts.ref, current: Number(oldCounts.data()?.notificationDevices ?? 0), amount: 0 });
        reclaimedCounts.get(uid)!.amount++;
      }
    }
    const activating = action === 'register' && device?.data()?.state !== 'active';
    const ownedReclaims = reclaimedCounts.get(identity.uid)?.amount ?? 0;
    const ownCount = Math.max(0, Number(counts?.data()?.notificationDevices ?? 0) - ownedReclaims);
    if (activating && ownCount >= 3) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de aparelhos com notificações.');
    const revision = (device?.data()?.revision ?? 0) + 1;
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision, serverTime: now, result: 'applied' };
    if (registration && ownerRef) {
      transaction.set(target, {
        uid: identity.uid, deviceId: command.entityId, platform: registration.platform, label: registration.label,
        tokenHash, state: 'active', revision, createdAt: device?.data()?.createdAt ?? now, updatedAt: now,
      });
      // Raw FCM credentials remain separate from client-readable metadata and
      // from the ownership record; the latter stores only account/device IDs.
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: registration.token, state: 'active', createdAt: now, updatedAt: now });
      transaction.set(ownerRef, { uid: identity.uid, deviceId: command.entityId, updatedAt: now });
      transaction.set(minuteRef, { count: (minute?.data()?.count ?? 0) + 1, updatedAt: now });
      transaction.set(dayRef, { count: (day?.data()?.count ?? 0) + 1, updatedAt: now });
    } else if (device?.exists) {
      transaction.update(target, { state: 'revoked', revision, updatedAt: now });
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: null, state: 'revoked', updatedAt: now }, { merge: true });
    }
    if (priorOwnerRef && priorOwner?.data()?.uid === identity.uid && priorOwner.data()?.deviceId === command.entityId) transaction.delete(priorOwnerRef);
    for (let index = 0; index < previousTokenDocs.length; index++) {
      transaction.update(previousTokenDocs[index]!.ref, { state: 'revoked', token: null, updatedAt: now });
      const oldDevice = previousSnapshots[index * 2];
      if (oldDevice?.data()?.state === 'active' && oldDevice.data()?.tokenHash === tokenHash) transaction.update(oldDevice.ref, { state: 'revoked', updatedAt: now });
    }
    for (const [uid, entry] of reclaimedCounts) if (uid !== identity.uid) transaction.set(entry.ref, { notificationDevices: Math.max(0, entry.current - entry.amount) }, { merge: true });
    const ownDelta = activating ? 1 : action === 'revoke' && device?.data()?.state === 'active' ? -1 : 0;
    if (ownDelta || ownedReclaims) transaction.set(countsRef, { notificationDevices: Math.max(0, ownCount + ownDelta) }, { merge: true });
    transaction.create(receipt, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    return response;
  });
}
