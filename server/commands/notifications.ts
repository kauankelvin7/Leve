import type { DecodedIdToken } from 'firebase-admin/auth';
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
  return db.runTransaction(async transaction => {
    const [profile, member, previous, device, counts] = await transaction.getAll(root, db.doc(`memberships/${identity.uid}`), receipt, target, countsRef);
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
      const registration = input as { token: string; platform: 'web'; label: string };
      transaction.set(target, {
        uid: identity.uid, deviceId: command.entityId, platform: registration.platform, label: registration.label,
        tokenHash: hashValue(registration.token), state: 'active', revision,
        createdAt: device?.data()?.createdAt ?? now, updatedAt: now,
      });
      // Raw FCM credentials stay in the server-only collection, never alongside device metadata.
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: registration.token, state: 'active', createdAt: now, updatedAt: now });
    } else if (device?.exists) {
      transaction.update(target, { state: 'revoked', revision, updatedAt: now });
      transaction.set(tokenTarget, { uid: identity.uid, deviceId: command.entityId, token: null, state: 'revoked', updatedAt: now }, { merge: true });
    }
    if (activating) transaction.set(countsRef, { notificationDevices: (counts?.data()?.notificationDevices ?? 0) + 1 }, { merge: true });
    if (action === 'revoke' && device?.data()?.state === 'active') transaction.set(countsRef, { notificationDevices: Math.max(0, (counts?.data()?.notificationDevices ?? 1) - 1) }, { merge: true });
    transaction.create(receipt, { uid: identity.uid, hash: digest, response, createdAt: now });
    transaction.update(root, { dataVersion: (profile?.data()?.dataVersion ?? 0) + 1, updatedAt: now });
    return response;
  });
}
