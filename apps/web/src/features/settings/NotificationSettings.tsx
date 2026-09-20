import { useEffect, useState } from 'react';
import { sendCommand } from '../../platform/api';
import { firebaseApp } from '../../platform/firebase';
import { notificationDeviceId, rememberNotificationDevice, revokeNotificationDevice } from '../../platform/notifications';
import { useAuth } from '../identity/AuthProvider';
import { armReminderSound, playReminderFeedback } from '../../platform/reminderFeedback';

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
    armReminderSound();
    setBusy(true); setMessage('');
    try {
      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!firebaseApp || !vapidKey || !await isSupported() || !('serviceWorker' in navigator)) throw new Error('Notificações não estão disponíveis neste navegador.');
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') throw new Error('A permissão de notificações não foi concedida.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
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

  async function previewNotification() {
    armReminderSound(); playReminderFeedback();
    setBusy(true); setMessage('');
    try {
      if (Notification.permission !== 'granted') throw new Error('Permita notificações antes de experimentar.');
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error('Feche e abra o Leve para concluir a atualização.');
      const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = { body: 'Teste de lembrete do Leve.', icon: '/favicon.svg', tag: 'leve-device-preview', renotify: true, silent: false, vibrate: [140, 70, 180] };
      await registration.showNotification('Leve', options);
      setMessage('Aviso de teste enviado.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível mostrar o aviso.'); }
    finally { setBusy(false); }
  }

  return <section className={compact ? 'notification-compact' : 'panel content-form notification-settings'}>
    {!compact && <h2>Notificações neste aparelho</h2>}
    <p>{permission === 'denied' ? 'Permissão bloqueada. Permita notificações nas configurações do Android e deste site no navegador.' : permission === 'unsupported' ? 'Este navegador não oferece notificações.' : permission === 'granted' ? activeDeviceId ? 'Notificações ativas.' : 'Permissão concedida. Ative este aparelho.' : 'Ative para permitir notificações.'}</p>
    <div className="dialog-actions">
      <button type="button" disabled={busy || permission === 'denied' || permission === 'unsupported'} onClick={() => void enable()}>{busy ? 'Aguarde…' : activeDeviceId ? 'Renovar notificações' : 'Ativar notificações'}</button>
      {permission === 'granted' && <button type="button" disabled={busy} onClick={() => void previewNotification()}>Testar notificação</button>}
      {activeDeviceId && <button type="button" disabled={busy} onClick={() => void disable()}>Desativar notificações</button>}
    </div>
    <p role="status">{message}</p>
  </section>;
}
