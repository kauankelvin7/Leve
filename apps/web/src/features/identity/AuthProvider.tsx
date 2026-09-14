import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SessionResult } from '../../../../../packages/domain/src/identity';
import { firebaseAuth, firestore } from '../../platform/firebase';
import { apiRequest } from '../../platform/api';
import { revokeNotificationDevice } from '../../platform/notifications';

type AuthState = { user: User | null; session: SessionResult | null; loading: boolean; error: string; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = session?.profile?.colorTheme ?? 'green';
  }, [session?.profile?.colorTheme]);
  const refresh = useCallback(async () => {
    const currentGeneration = ++generation.current;
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) { setSession(null); setLoading(false); return; }
    if (!currentUser.emailVerified) { setSession(null); setError(''); setLoading(false); return; }
    try {
      const result = await apiRequest<SessionResult>('/session');
      if (currentGeneration === generation.current && firebaseAuth?.currentUser?.uid === currentUser.uid) { setSession(result); setError(''); }
    } catch (failure) {
      if (currentGeneration === generation.current) { setSession(null); setError(failure instanceof Error ? failure.message : 'Não foi possível carregar sua conta.'); }
    } finally { if (currentGeneration === generation.current) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onIdTokenChanged(firebaseAuth, currentUser => {
      setUser(currentUser); setSession(null); setError(''); setLoading(Boolean(currentUser));
      if (currentUser?.emailVerified) void refresh();
      else setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    if (!user || !firestore || session?.membership !== 'active') return;
    return onSnapshot(doc(firestore, 'memberships', user.uid), snapshot => {
      if (snapshot.data()?.state !== 'active') { setSession(null); void refresh(); }
    }, () => { setSession(null); setError('Não foi possível verificar o acesso à conta.'); });
  }, [user, session?.membership, refresh]);

  const logout = useCallback(async () => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) await revokeNotificationDevice(uid).catch(() => undefined);
    generation.current++; setSession(null); setUser(null); setError('');
    if (firebaseAuth) await signOut(firebaseAuth);
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, error, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
