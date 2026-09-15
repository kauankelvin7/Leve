import { useCallback, useEffect, useRef, useState } from 'react';
import { flushOutbox } from '../../platform/api';
import { pendingCommands } from '../../platform/outbox';
import { useAuth } from '../identity/AuthProvider';

type UpdateTarget = ServiceWorkerRegistration | 'release';

export function OutboxStatus() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  const [update, setUpdate] = useState<UpdateTarget | null>(null);
  const [outboxChecked, setOutboxChecked] = useState(false);
  const applyingUpdate = useRef(false);
  const refresh = useCallback(async () => { setCount(user ? (await pendingCommands(user.uid)).length : 0); setOutboxChecked(true); }, [user]);
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
    const releaseReady = () => setUpdate('release');
    window.addEventListener('leve:outbox-changed', changed); window.addEventListener('leve:outbox-conflict', conflict); window.addEventListener('leve:update-ready', updateReady); window.addEventListener('leve:release-ready', releaseReady); window.addEventListener('online', online);
    void refresh(); void sync();
    if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration().then(registration => { if (registration?.waiting) setUpdate(registration); });
    return () => { window.removeEventListener('leve:outbox-changed', changed); window.removeEventListener('leve:outbox-conflict', conflict); window.removeEventListener('leve:update-ready', updateReady); window.removeEventListener('leve:release-ready', releaseReady); window.removeEventListener('online', online); };
  }, [refresh, sync]);
  useEffect(() => {
    if (!outboxChecked || count || !update || applyingUpdate.current) return;
    applyingUpdate.current = true;
    if (update === 'release') { window.location.reload(); return; }
    if (!update.waiting) { applyingUpdate.current = false; return; }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    update.waiting.postMessage('SKIP_WAITING');
  }, [count, outboxChecked, update]);
  if (!count && !message && !update) return null;
  return <div className="sync-status" role="status">{message || (count ? count + (count === 1 ? ' alteração salva' : ' alterações salvas') + ' neste aparelho.' : 'Atualizando o Leve…')}{count ? <button type="button" onClick={() => void sync()}>Tentar sincronizar</button> : null}</div>;
}
