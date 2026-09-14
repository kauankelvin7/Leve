import { useEffect, useState } from 'react';
import { sendCommand } from '../../platform/api';
import { firebaseApp } from '../../platform/firebase';
import { notificationDeviceId, rememberNotificationDevice, revokeNotificationDevice } from '../../platform/notifications';
import { useAuth } from '../identity/AuthProvider';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  useEffect(() => {
    const update = () => setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  const activeDeviceId = user ? notificationDeviceId(user.uid) : null;

  async function enable() {
    setBusy(true); setMessage('');
    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!firebaseApp || !vapidKey || !await isSupported() || !('serviceWorker' in navigator)) throw new Error('Notificações não estão disponíveis neste navegador.');
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') throw new Error('A permissão de notificações não foi concedida.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) throw new Error('Não foi possível registrar este aparelho.');
      if (!user) throw new Error('Entre na sua conta para ativar notificações.');
      const deviceId = activeDeviceId ?? crypto.randomUUID();
      await sendCommand({ command: 'notificationDevice.register', operationId: crypto.randomUUID(), entityId: deviceId, expectedRevision: 0, payload: { token, platform: 'web', label: navigator.userAgent.slice(0, 80) } }, { queueOnNetworkError: false });
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

  return <section className={compact ? 'notification-compact' : 'panel content-form notification-settings'}>{!compact && <h2>Notificações neste aparelho</h2>}<p>{permission === 'denied' ? 'Permissão bloqueada. Nas configurações deste site no navegador, permita notificações e volte ao Leve.' : permission === 'unsupported' ? 'Este navegador não oferece notificações. A agenda continua disponível.' : permission === 'granted' ? activeDeviceId ? 'Permissão concedida e aparelho registrado.' : 'Permissão concedida. Ative abaixo para registrar este aparelho.' : 'Permissão ainda não solicitada. O navegador pedirá somente ao ativar.'}</p>{activeDeviceId ? <button type="button" disabled={busy} onClick={() => void disable()}>Desativar neste aparelho</button> : <button type="button" className="primary" disabled={busy || permission === 'denied' || permission === 'unsupported'} onClick={() => void enable()}>{busy ? 'Ativando…' : 'Ativar notificações'}</button>}<p role="status">{message}</p></section>;
}
