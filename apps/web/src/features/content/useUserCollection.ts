import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, query } from 'firebase/firestore';
import { firestore } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';

export function useUserCollection<T>(path: string, nested = false) {
  const { user } = useAuth();
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !firestore) return;
    const target = nested ? `users/${user.uid}/${path}` : `users/${user.uid}/${path}`;
    return onSnapshot(query(collection(firestore, target), limit(50)), snapshot => {
      setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T & { id: string })));
      setLoading(false); setError('');
    }, () => { setLoading(false); setError('Não foi possível carregar estes dados.'); });
  }, [user, path, nested]);
  return { items, loading, error };
}

export function useUserSubcollections<T>(parentPath: string, parentIds: string[], childCollection: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<(T & { id: string; parentId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !firestore) return;
    if (!parentIds.length) { setItems([]); setLoading(false); setError(''); return; }
    setLoading(true);
    const byParent = new Map<string, (T & { id: string; parentId: string })[]>();
    const unsubs = parentIds.map(parentId => onSnapshot(query(collection(firestore!, `users/${user.uid}/${parentPath}/${parentId}/${childCollection}`), limit(50)), snapshot => {
      byParent.set(parentId, snapshot.docs.map(item => ({ parentId, id: item.id, ...item.data() } as T & { id: string; parentId: string })));
      setItems([...byParent.values()].flat());
      setLoading(false); setError('');
    }, () => { setLoading(false); setError('Não foi possível carregar estes dados.'); }));
    return () => unsubs.forEach(unsubscribe => unsubscribe());
  }, [user, parentPath, childCollection, parentIds.join('|')]);
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
