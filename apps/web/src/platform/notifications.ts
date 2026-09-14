import { sendCommand } from './api';
import { firebaseApp } from './firebase';

function deviceKey(uid: string) {
  return `leve.notificationDeviceId.${uid}`;
}

export function notificationDeviceId(uid: string) {
  const scoped = localStorage.getItem(deviceKey(uid));
  if (scoped) return scoped;
  const legacy = localStorage.getItem('leve.notificationDeviceId');
  if (!legacy) return null;
  localStorage.setItem(deviceKey(uid), legacy);
  localStorage.removeItem('leve.notificationDeviceId');
  return legacy;
}

export function rememberNotificationDevice(uid: string, deviceId: string) {
  localStorage.setItem(deviceKey(uid), deviceId);
}

export async function revokeNotificationDevice(uid: string) {
  const deviceId = notificationDeviceId(uid);
  if (!deviceId) return;
  let revokedOnServer = false;
  let tokenDeleted = false;
  let failure: unknown;
  try {
    await sendCommand({ command: 'notificationDevice.revoke', operationId: crypto.randomUUID(), entityId: deviceId, expectedRevision: 0, payload: {} }, { queueOnNetworkError: false });
    revokedOnServer = true;
  } catch (error) { failure = error; }
  try {
    if (firebaseApp) {
      const { deleteToken, getMessaging, isSupported } = await import('firebase/messaging');
      if (await isSupported()) tokenDeleted = await deleteToken(getMessaging(firebaseApp));
    }
  } catch (error) { failure ??= error; }
  if (revokedOnServer || tokenDeleted) localStorage.removeItem(deviceKey(uid));
  if (!revokedOnServer && !tokenDeleted && failure) throw failure;
}
