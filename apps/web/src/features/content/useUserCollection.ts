import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, query } from 'firebase/firestore';
import { firestore } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';
import { useLiveQueries } from './useLiveQueries';
import { where } from 'firebase/firestore';

export function useUserCollection<T>(path: string, _nested = false, deletedOnly = false) {
  const { user } = useAuth();
  const [maximum, setMaximum] = useState(50);
  const result = useLiveQueries(`collection:${path}:${deletedOnly}:${maximum}`, () => !user || !firestore ? [] : [query(collection(firestore, `users/${user.uid}/${path}`), ...(deletedOnly ? [where('deletedAt', '>', '')] : []), limit(maximum))], maximum);
  return { ...result, items: result.items as (T & { id: string })[], loadMore: () => setMaximum(current => Math.min(5000, current + 50)) };
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
  const [item, setItem] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);
    return onSnapshot(doc(firestore, `users/${user.uid}/${path}`), snapshot => {
      setItem(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T & { id: string } : null);
      setLoading(false); setError('');
    }, () => { setLoading(false); setError('Não foi possível carregar este item.'); });
  }, [user, path]);
  return { item, loading, error };
}
