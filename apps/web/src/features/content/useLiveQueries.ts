import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { onSnapshot, type Query, type DocumentData } from 'firebase/firestore';
import { firebaseAuth } from '../../platform/firebase';
import { apiRequest } from '../../platform/api';

type Row = DocumentData & { id: string };
type State = { items: Row[]; loading: boolean; error: string; partial: boolean; cached: boolean };
type Entry = { state: State; listeners: Set<() => void>; stop?: () => void; touched: number };
const cache = new Map<string, Entry>();
const empty: State = { items: [], loading: true, error: '', partial: false, cached: false };
const LIVE_QUERY_TIMEOUT_MS = 25_000;
let cacheUid: string | null = null;
export function clearQueryCache() {
  for (const entry of cache.values()) { entry.stop?.(); entry.state = empty; entry.listeners.forEach(notify => notify()); }
  cache.clear(); cacheUid = null;
}

// Memory only, scoped to the signed-in account. Listeners are shared and released on navigation.
export function useLiveQueries(key: string, makeQueries: () => Query[], pageSize = 50) {
  const uid = firebaseAuth?.currentUser?.uid ?? null;
  if (cacheUid !== uid) { clearQueryCache(); cacheUid = uid; }
  const scopedKey = `${uid}:${key}`;
  if (!cache.has(scopedKey)) cache.set(scopedKey, { state: empty, listeners: new Set(), touched: Date.now() });
  const entry = cache.get(scopedKey)!;
  const start = useCallback(() => {
    if (entry.stop || !uid) return;
    entry.touched = Date.now();
    const targets = makeQueries();
    const groups: Row[][] = targets.map(() => []);
    const ready = new Set<number>(); const failed = new Set<number>(); const local = new Set<number>();
    let alive = true;
    const publish = (patch: Partial<State>) => {
      if (!alive) return;
      entry.state = { ...entry.state, ...patch }; entry.listeners.forEach(notify => notify());
    };
    publish({ loading: !entry.state.items.length, error: '', cached: entry.state.items.length > 0 });
    const timeout = window.setTimeout(() => publish({ loading: false, error: 'A conexão está demorando. Verifique sua internet e tente novamente.' }), LIVE_QUERY_TIMEOUT_MS);
    const stops = targets.map((target, index) => onSnapshot(target, { includeMetadataChanges: true }, snapshot => {
      groups[index] = snapshot.docs.map(document => ({ ...document.data(), id: document.id }));
      ready.add(index); failed.delete(index);
      if (snapshot.metadata.fromCache) local.add(index); else local.delete(index);
      if (ready.size === targets.length && !local.size) window.clearTimeout(timeout);
      // Never mix a partially refreshed query group with an older group.
      if (ready.size === targets.length && !failed.size) publish({ items: [...new Map(groups.flat().map(item => [item.id, item])).values()], loading: local.size > 0 && !groups.some(group => group.length), error: local.size ? entry.state.error : '', partial: groups.some(group => group.length === pageSize), cached: local.size > 0 });
    }, failure => {
      failed.add(index); window.clearTimeout(timeout);
      publish({ loading: false, error: 'Não conseguimos carregar suas atividades agora. Verifique sua conexão e tente novamente.' });
      // Only a bounded diagnostic reaches the server, never document contents or SDK URLs.
      const precondition = failure.code === 'failed-precondition'
        ? (failure.message.toLowerCase().includes('index') ? 'index' : 'other')
        : undefined;
      void apiRequest('/commands', { method: 'POST', body: JSON.stringify({ command: 'diagnostic.report', operationId: crypto.randomUUID(), entityId: uid, payload: { surface: key.startsWith('calendar') ? 'calendar' : 'content', code: failure.code, queryIndex: index, precondition } }) }).catch(() => undefined);
    }));
    if (!targets.length) { window.clearTimeout(timeout); publish({ items: [], loading: false, cached: false }); }
    entry.stop = () => { alive = false; window.clearTimeout(timeout); stops.forEach(stop => stop()); entry.stop = undefined; };
  // The semantic key owns query identity, independent of render-created closures.
  }, [scopedKey]);
  const subscribe = useCallback((notify: () => void) => {
    entry.listeners.add(notify); start();
    return () => { entry.listeners.delete(notify); if (!entry.listeners.size) entry.stop?.(); };
  }, [scopedKey, start]);
  const state = useSyncExternalStore(subscribe, () => entry.state);
  const retry = useCallback(() => { entry.stop?.(); start(); }, [start]);
  useEffect(() => {
    if (cache.size > 24) for (const [oldKey, old] of cache) { if (!old.listeners.size && oldKey !== scopedKey) cache.delete(oldKey); if (cache.size <= 24) break; }
  }, [scopedKey]);
  return { ...state, retry };
}
