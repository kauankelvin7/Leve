import { useCallback, useEffect, useState } from 'react';
import { flushOutbox } from '../../platform/api';
import { pendingCommands } from '../../platform/outbox';
import { useAuth } from '../identity/AuthProvider';

export function OutboxStatus() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const refresh = useCallback(async () => { setCount(user ? (await pendingCommands(user.uid)).length : 0); }, [user]);
  const sync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    await flushOutbox(user.uid);
    await refresh();
  }, [user, refresh]);
  useEffect(() => {
    const changed = () => void refresh();
    const online = () => void sync();
    const conflict = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    const updateReady = (event: Event) => setUpdate((event as CustomEvent<ServiceWorkerRegistration>).detail);
    window.addEventListener('leve:outbox-changed', changed); window.addEventListener('leve:outbox-conflict', conflict); window.addEventListener('leve:update-ready', updateReady); window.addEventListener('online', online);
    void refresh(); void sync();
    if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration().then(registration => { if (registration?.waiting) setUpdate(registration); });
    return () => { window.removeEventListener('leve:outbox-changed', changed); window.removeEventListener('leve:outbox-conflict', conflict); window.removeEventListener('leve:update-ready', updateReady); window.removeEventListener('online', online); };
  }, [refresh, sync]);
  if (!count && !message && !update) return null;
  function applyUpdate() { if (!update?.waiting || count) return; navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); update.waiting.postMessage('SKIP_WAITING'); }
  return <div className="sync-status" role="status">{message || (count ? count + (count === 1 ? ' alteração salva' : ' alterações salvas') + ' neste aparelho.' : 'Uma atualização do Leve está pronta.')}{count ? <button type="button" onClick={() => void sync()}>Tentar sincronizar</button> : update ? <button type="button" onClick={applyUpdate}>Atualizar agora</button> : null}</div>;
}
