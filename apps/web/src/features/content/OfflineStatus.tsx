import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';

export function OfflineStatus() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let dismissTimer: number | undefined;
    const onOffline = () => { if (dismissTimer) window.clearTimeout(dismissTimer); setRestored(false); setOffline(true); };
    const onOnline = () => {
      setOffline(false); setRestored(true);
      dismissTimer = window.setTimeout(() => setRestored(false), 5000);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      if (dismissTimer) window.clearTimeout(dismissTimer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline && !restored) return null;
  return <aside className={`offline-mode-banner ${offline ? 'is-offline' : 'is-restored'}`} role="status" aria-live="polite">
    <span className="offline-mode-icon"><Icon name="cloud" /></span>
    <div><strong>{offline ? 'Modo offline' : 'Conexão restaurada'}</strong><p>{offline ? 'Sua agenda continua disponível. Alterações novas serão sincronizadas quando a conexão voltar.' : 'A conexão voltou. Alterações pendentes serão sincronizadas agora.'}</p></div>
    <span className="offline-mode-badge">{offline ? 'Offline' : 'Online'}</span>
  </aside>;
}
