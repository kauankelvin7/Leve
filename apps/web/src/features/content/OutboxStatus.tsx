import { useCallback, useEffect, useRef, useState } from 'react';
import { flushOutbox } from '../../platform/api';
import { pendingCommands, removeCommand, type PendingCommand } from '../../platform/outbox';
import { useAuth } from '../identity/AuthProvider';

import { OutboxRecovery } from './OutboxRecovery';

type UpdateTarget = ServiceWorkerRegistration | 'release';

export function OutboxStatus() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PendingCommand[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const visibleEntries = entries.filter(entry => entry.uid === user?.uid);
  const count = visibleEntries.length;
  const [message, setMessage] = useState('');
  const [update, setUpdate] = useState<UpdateTarget | null>(null);
  const [outboxChecked, setOutboxChecked] = useState(false);
  const applyingUpdate = useRef(false);
  const refresh = useCallback(async () => {
    const uid = user?.uid;
    const queued = uid ? await pendingCommands(uid) : [];
    if (activeUid.current !== uid) return;
    setEntries(queued); setOutboxChecked(true);
  }, [user]);
  useEffect(() => { setMessage(''); setReviewing(false); setOutboxChecked(false); }, [user?.uid]);
  const removeReviewedCommand = async (entry: PendingCommand) => {
    if (!user || entry.uid !== user.uid || activeUid.current !== entry.uid) throw new Error('Account changed');
    await removeCommand(entry.uid, entry.operationId);
    await refresh(); setMessage('');
  };
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
  return <><div className="sync-status" role="status">{message || (count ? count + (count === 1 ? ' alteração salva' : ' alterações salvas') + ' neste aparelho.' : 'Atualizando o Leve…')}{count ? <><button type="button" onClick={() => setReviewing(true)}>Revisar alterações</button><button type="button" onClick={() => void sync()}>Tentar sincronizar</button></> : null}</div>{reviewing ? <OutboxRecovery key={user?.uid} entries={visibleEntries} onRemove={removeReviewedCommand} onClose={() => setReviewing(false)} /> : null}</>;
}
