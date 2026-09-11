import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
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
