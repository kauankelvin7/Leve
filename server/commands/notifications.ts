import type { DecodedIdToken } from 'firebase-admin/auth';
import type { DocumentReference } from 'firebase-admin/firestore';
import { notificationDeviceSchema, notificationRevokeSchema } from '../../packages/domain/src/notifications.ts';
import type { CommandEnvelope, CommandResult } from '../../packages/domain/src/identity.ts';
import { AppError } from '../errors.ts';
import { db } from '../platform/firebase.ts';
import { commandHash } from './identity.ts';
import { hashValue } from '../hash.ts';

export async function notificationCommand(identity: DecodedIdToken, command: CommandEnvelope): Promise<CommandResult> {
  const action = command.command.split('.')[1];
  const input = action === 'register' ? notificationDeviceSchema.parse(command.payload) : notificationRevokeSchema.parse(command.payload);
  if (!['register', 'revoke'].includes(action ?? '')) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
  const root = db.doc(`users/${identity.uid}`);
  const target = db.doc(`notificationDevices/${identity.uid}_${command.entityId}`);
  const tokenTarget = db.doc(`notificationTokens/${identity.uid}_${command.entityId}`);
  const receipt = db.doc(`commandReceipts/${identity.uid}_${command.operationId}`);
  const countsRef = root.collection('internal').doc('counts');
  const now = new Date().toISOString();
  const digest = commandHash(command);
  const registration = action === 'register' ? input as { token: string; platform: 'web'; label: string } : null;
  // FCM may reuse a browser token after an account switch. Reclaim any previous
  // owner in the same transaction so a reminder cannot cross account boundaries.
  const previousTokenDocs = registration
    ? (await db.collection('notificationTokens').where('token', '==', registration.token).limit(10).get()).docs.filter(record => record.data().state === 'active' && record.id !== tokenTarget.id)
    : [];
  const previousRefs = previousTokenDocs.flatMap(record => [record.ref, db.doc(`notificationDevices/${record.data().uid}_${record.data().deviceId}`), db.doc(`users/${record.data().uid}/internal/counts`)]);
  return db.runTransaction(async transaction => {
    const [profile, member, previous, device, counts, ...previousSnapshots] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), receipt, target, countsRef, ...previousRefs);
    if (profile?.data()?.accountState !== 'active' || member?.data()?.state !== 'active') throw new AppError(403, 'FORBIDDEN', 'Conta indisponível.');
    if (previous?.exists) {
      if (previous.data()?.hash !== digest) throw new AppError(409, 'OPERATION_MISMATCH', 'Esta operação já foi usada com outros dados.');
      return { ...previous.data()!.response, result: 'alreadyApplied' } as CommandResult;
    }
    const revision = (device?.data()?.revision ?? 0) + 1;
    const activating = action === 'register' && device?.data()?.state !== 'active';
    if (activating && (counts?.data()?.notificationDevices ?? 0) >= 3) throw new AppError(422, 'STOCK_LIMIT', 'Você atingiu o limite de aparelhos com notificações.');
    const response: CommandResult = { operationId: command.operationId, entityId: command.entityId, revision, serverTime: now, result: 'applied' };
    if (action === 'register') {
      const currentRegistration = registration;
      if (!currentRegistration) throw new AppError(422, 'VALIDATION_ERROR', 'Comando desconhecido.');
      transaction.set(target, {
        uid: identity.uid, deviceId: command.entityId, platform: currentRegistration.platform, label: currentRegistration.label,
        tokenHash: hashValue(currentRegistration.token), state: 'active', revision,
        createdAt: device?.data()?.createdAt ?? now, updatedAt: now,
      });
      // Raw FCM credentials stay in the server-only collection, never alongside device metadata.
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: currentRegistration.token, state: 'active', createdAt: now, updatedAt: now });
    } else if (device?.exists) {
      transaction.update(target, { state: 'revoked', revision, updatedAt: now });
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: null, state: 'revoked', updatedAt: now }, { merge: true });
    }
    const reclaimedCounts = new Map<string, { ref: DocumentReference; current: number; amount: number }>();
    for (let index = 0; index < previousTokenDocs.length; index += 1) {
      const tokenSnapshot = previousSnapshots[index * 3];
      const deviceSnapshot = previousSnapshots[index * 3 + 1];
      const countsSnapshot = previousSnapshots[index * 3 + 2];
      if (!tokenSnapshot?.exists || tokenSnapshot.data()?.state !== 'active' || tokenSnapshot.data()?.token !== registration?.token) continue;
      transaction.update(tokenSnapshot.ref, { state: 'revoked', token: null, updatedAt: now });
      if (deviceSnapshot?.exists && deviceSnapshot.data()?.state === 'active') {
        transaction.update(deviceSnapshot.ref, { state: 'revoked', updatedAt: now });
        const uid = String(tokenSnapshot.data()?.uid ?? '');
        if (uid && countsSnapshot && !reclaimedCounts.has(uid)) reclaimedCounts.set(uid, { ref: countsSnapshot.ref, current: Number(countsSnapshot.data()?.notificationDevices ?? 0), amount: 0 });
        const entry = uid ? reclaimedCounts.get(uid) : undefined;
        if (entry) entry.amount += 1;
      }
    }
    for (const entry of reclaimedCounts.values()) transaction.set(entry.ref, { notificationDevices: Math.max(0, entry.current - entry.amount) }, { merge: true });
    if (activating) transaction.set(countsRef, { notificationDevices: (counts?.data()?.notificationDevices ?? 0) + 1 }, { merge: true });
    if (action === 'revoke' && device?.data()?.state === 'active') transaction.set(countsRef, { notificationDevices: Math.max(0, (counts?.data()?.notificationDevices ?? 1) - 1) }, { merge: true });
    transaction.create(receipt, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    return response;
  });
}
