import { useState } from 'react';
import { sendCommand } from '../../platform/api';
import { firebaseApp } from '../../platform/firebase';
import { notificationDeviceId, rememberNotificationDevice, revokeNotificationDevice } from '../../platform/notifications';
import { useAuth } from '../identity/AuthProvider';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function NotificationSettings() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const activeDeviceId = user ? notificationDeviceId(user.uid) : null;

  async function enable() {
    setBusy(true); setMessage('');
    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!firebaseApp || !vapidKey || !await isSupported() || !('serviceWorker' in navigator)) throw new Error('Notificações não estão disponíveis neste navegador.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('A permissão de notificações não foi concedida.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) throw new Error('Não foi possível registrar este aparelho.');
      if (!user) throw new Error('Entre na sua conta para ativar notificações.');
      const deviceId = activeDeviceId ?? crypto.randomUUID();
      await sendCommand({ command: 'notificationDevice.register', operationId: crypto.randomUUID(), entityId: deviceId, expectedRevision: 0, payload: { token, platform: 'web', label: navigator.userAgent.slice(0, 80) } });
      rememberNotificationDevice(user.uid, deviceId);
      setMessage('Notificações ativadas neste aparelho.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível ativar notificações.'); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (!firebaseApp || !activeDeviceId || !user) return;
    setBusy(true); setMessage('');
    try {
      await revokeNotificationDevice(user.uid);
      setMessage('Notificações desativadas neste aparelho.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível desativar notificações.'); }
    finally { setBusy(false); }
  }

  return <section className="panel content-form"><h2>Notificações neste aparelho</h2><p>O navegador pedirá permissão somente ao ativar. A agenda continua funcionando sem notificações.</p>{activeDeviceId ? <button type="button" disabled={busy} onClick={() => void disable()}>Desativar neste aparelho</button> : <button type="button" className="primary" disabled={busy} onClick={() => void enable()}>Ativar notificações</button>}<p role="status">{message}</p></section>;
}
