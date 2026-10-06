import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { firebaseApp } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';
import { playReminderFeedback } from '../../platform/reminderFeedback';

export function NotificationBanner() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<{ title: string; body: string; url: string } | null>(null);
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;
    const uid = user.uid;
    const receive = (event: MessageEvent) => {
      if (event.data?.type !== 'LEVE_REMINDER') return;
      const data = event.data.data;
      if (typeof data?.body !== 'string' || data.uid !== uid) return;
      playReminderFeedback();
        setNotice({ title: 'Lembrete do Leve', body: 'Chegou a hora de uma atividade. Toque para abrir sua agenda.', url: typeof data.url === 'string' && /^\/atividade\/[A-Za-z0-9_-]+$/.test(data.url) ? data.url : '/hoje' });
    };
    navigator.serviceWorker.addEventListener('message', receive);
    return () => navigator.serviceWorker.removeEventListener('message', receive);
  }, [user?.uid]);
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let alive = true; let stop: (() => void) | undefined;
    setNotice(null);
    void import('firebase/messaging').then(async ({ getMessaging, isSupported, onMessage }) => {
      if (!firebaseApp || !await isSupported() || !alive) return;
      stop = onMessage(getMessaging(firebaseApp), payload => {
        if (!alive) return;
        if (payload.data?.uid !== uid) return;
        const url = payload.data?.url ?? '';
        playReminderFeedback();
        setNotice({ title: 'Lembrete do Leve', body: 'Chegou a hora de uma atividade. Toque para abrir sua agenda.', url: /^\/atividade\/[A-Za-z0-9_-]+$/.test(url) ? url : '/hoje' });
      });
    }).catch(() => undefined);
    return () => { alive = false; stop?.(); };
  }, [user?.uid]);
  useEffect(() => { if (!notice) return; const timeout = window.setTimeout(() => setNotice(null), 15_000); return () => window.clearTimeout(timeout); }, [notice]);
  return notice ? createPortal(<aside className="notification-banner" role="status"><div><strong>{notice.title}</strong><p>{notice.body}</p></div><Link to={notice.url} onClick={() => setNotice(null)}>Abrir</Link><button className="icon-button" aria-label="Fechar notificação" title="Fechar" onClick={() => setNotice(null)}><Icon name="close" /></button></aside>, document.body) : null;
}
