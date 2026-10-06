import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';
import { useLiveQueries } from './useLiveQueries';
import { where } from 'firebase/firestore';
import type { TimeEntry } from '../../../../../packages/domain/src/content';

export function useUserCollection<T>(path: string, _nested = false, deletedOnly = false) {
  const { user } = useAuth();
  const maximum = 50;
  const order = path === 'timeEntries' && !deletedOnly ? [orderBy('startedAt', 'desc')] : [];
  const result = useLiveQueries(`collection:${path}:${deletedOnly}`, () => !user || !firestore ? [] : [query(collection(firestore, `users/${user.uid}/${path}`), ...(deletedOnly ? [where('deletedAt', '>', '')] : []), ...order, limit(maximum))], maximum);
  return { ...result, partial: false, items: result.items as (T & { id: string })[] };
}

export function useActiveTimeEntry() {
  const active = useUserDocument<{ entryId: string }>('internal/activeTimer');
  const entry = useUserDocument<TimeEntry>(active.item?.entryId ? `timeEntries/${active.item.entryId}` : '');
  return {
    item: entry.item && !entry.item.deletedAt && !entry.item.endedAt ? entry.item : null,
    loading: active.loading || entry.loading,
    error: active.error || entry.error,
  };
}

export function useActivityTimeEntries(activityId: string) {
  const { user } = useAuth();
  const result = useLiveQueries(`activity-time-entries:${activityId}`, () => !user || !firestore || !activityId ? [] : [
    query(collection(firestore, `users/${user.uid}/timeEntries`), where('activityId', '==', activityId), orderBy('startedAt', 'desc'), limit(50)),
  ], 50);
  return { ...result, items: result.items as (TimeEntry & { id: string })[] };
}

export function useUserSubcollections<T>(parentPath: string, parentIds: string[], childCollection: string, deletedOnly = false) {
  const { user } = useAuth();
  const [items, setItems] = useState<(T & { id: string; parentId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !firestore) return;
    if (!parentIds.length) { setItems([]); setLoading(false); setError(''); return; }
    setLoading(true);
    const byParent = new Map<string, (T & { id: string; parentId: string })[]>();
    const failures = new Set<string>();
    const unsubs = parentIds.map(parentId => onSnapshot(query(collection(firestore!, `users/${user.uid}/${parentPath}/${parentId}/${childCollection}`), ...(deletedOnly ? [where('deletedAt', '>', '')] : []), limit(50)), snapshot => {
      byParent.set(parentId, snapshot.docs.map(item => ({ parentId, id: item.id, ...item.data() } as T & { id: string; parentId: string })));
      setItems([...byParent.values()].flat());
      failures.delete(parentId);
      setLoading(byParent.size + failures.size < parentIds.length); if (!failures.size) setError('');
    }, () => { failures.add(parentId); setLoading(false); setError('Não foi possível carregar estes dados.'); }));
    return () => unsubs.forEach(unsubscribe => unsubscribe());
  }, [user, parentPath, childCollection, parentIds.join('|'), deletedOnly]);
  return { items, loading, error };
}

export function useUserDocument<T>(path: string) {
  const { user } = useAuth();
  const identity = user && path ? `${user.uid}/${path}` : '';
  const [state, setState] = useState<{ identity: string; item: (T & { id: string }) | null; loading: boolean; error: string }>({ identity: '', item: null, loading: true, error: '' });
  useEffect(() => {
    if (!firestore || !identity) { setState({ identity, item: null, loading: false, error: '' }); return; }
    setState({ identity, item: null, loading: true, error: '' });
    return onSnapshot(doc(firestore, `users/${identity}`), snapshot => {
      setState({ identity, item: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T & { id: string } : null, loading: false, error: '' });
    }, () => { setState({ identity, item: null, loading: false, error: 'Não foi possível carregar este item.' }); });
  }, [identity]);
  // An old subscription can finish while another UID or resource is loading.
  const current = state.identity === identity ? state : { item: null, loading: Boolean(identity), error: '' };
  return { item: current.item, loading: current.loading, error: current.error };
}
