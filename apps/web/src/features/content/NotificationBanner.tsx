import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { firebaseApp } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';

export function NotificationBanner() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<{ title: string; body: string; url: string } | null>(null);
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.type !== 'LEVE_REMINDER') return;
      const data = event.data.data;
      if (typeof data?.body !== 'string') return;
      setNotice({ title: typeof data.title === 'string' ? data.title : 'Leve', body: data.body, url: typeof data.url === 'string' && /^\/atividade\/[A-Za-z0-9_-]+$/.test(data.url) ? data.url : '/hoje' });
    };
    navigator.serviceWorker.addEventListener('message', receive);
    return () => navigator.serviceWorker.removeEventListener('message', receive);
  }, [user?.uid]);
  useEffect(() => {
    let alive = true; let stop: (() => void) | undefined;
    setNotice(null);
    void import('firebase/messaging').then(async ({ getMessaging, isSupported, onMessage }) => {
      if (!firebaseApp || !await isSupported() || !alive) return;
      stop = onMessage(getMessaging(firebaseApp), payload => {
        if (!alive) return;
        const url = payload.data?.url ?? '';
        setNotice({ title: payload.data?.title ?? payload.notification?.title ?? 'Leve', body: payload.data?.body ?? payload.notification?.body ?? 'Você tem um lembrete.', url: /^\/atividade\/[A-Za-z0-9_-]+$/.test(url) ? url : '/hoje' });
      });
    }).catch(() => undefined);
    return () => { alive = false; stop?.(); };
  }, [user?.uid]);
  useEffect(() => { if (!notice) return; const timeout = window.setTimeout(() => setNotice(null), 15_000); return () => window.clearTimeout(timeout); }, [notice]);
  return notice ? <aside className="notification-banner" role="status"><div><strong>{notice.title}</strong><p>{notice.body}</p></div><Link to={notice.url} onClick={() => setNotice(null)}>Abrir</Link><button className="icon-button" aria-label="Fechar notificação" title="Fechar" onClick={() => setNotice(null)}><Icon name="close" /></button></aside> : null;
}
