import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SessionResult } from '../../../../../packages/domain/src/identity';
import { firebaseAuth, firestore } from '../../platform/firebase';
import { cacheSession, readCachedSession } from '../../platform/outbox';
import { ApiError, apiRequest } from '../../platform/api';
import { revokeNotificationDevice } from '../../platform/notifications';
import { clearQueryCache } from '../content/useLiveQueries';
import { applyColorTheme, applyAppearance, storedAppearance } from '../../platform/theme';

type AuthState = { user: User | null; session: SessionResult | null; loading: boolean; error: string; errorStatus: number | null; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    if (!session?.profile) return;
    const colorTheme = session?.profile?.colorTheme ?? 'green';
    applyColorTheme(colorTheme);
    applyAppearance(session?.profile?.appearance ?? storedAppearance());
  }, [session?.profile?.colorTheme, session?.profile?.appearance]);
  const refresh = useCallback(async () => {
    const currentGeneration = ++generation.current;
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) { setSession(null); setErrorStatus(null); setLoading(false); return; }
    if (!currentUser.emailVerified) { setSession(null); setError(''); setErrorStatus(null); setLoading(false); return; }
    try {
      const result = await apiRequest<SessionResult>('/session');
      await cacheSession(currentUser.uid, result).catch(() => undefined);
      if (currentGeneration === generation.current && firebaseAuth?.currentUser?.uid === currentUser.uid) { setSession(result); setError(''); setErrorStatus(null); }
    } catch (failure) {
      if (currentGeneration === generation.current) {
        const cached = failure instanceof ApiError && failure.code === 'NETWORK_ERROR' ? await readCachedSession(currentUser.uid).catch(() => null) : null;
        if (cached?.session?.uid === currentUser.uid && cached.session.membership === 'active' && cached.session.profile?.accountState === 'active') {
          setSession(cached.session); setError('Você está sem internet. Mostrando os dados salvos neste aparelho.'); setErrorStatus(null);
        } else {
          setSession(null);
          setError(failure instanceof Error ? failure.message : 'Não foi possível carregar sua conta.');
          setErrorStatus(failure instanceof ApiError ? failure.status : 500);
        }
      }
    } finally { if (currentGeneration === generation.current) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onIdTokenChanged(firebaseAuth, currentUser => {
      clearQueryCache();
      setUser(currentUser); setSession(null); setError(''); setErrorStatus(null); setLoading(Boolean(currentUser));
      if (currentUser?.emailVerified) void refresh();
      else setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    if (!user || !firestore || session?.membership !== 'active') return;
    return onSnapshot(doc(firestore, 'memberships', user.uid), snapshot => {
      if (snapshot.data()?.state !== 'active') { setSession(null); void refresh(); }
    }, () => { if (navigator.onLine) { setError('Não foi possível verificar o acesso à conta.'); setErrorStatus(503); } });
  }, [user, session?.membership, refresh]);

  const logout = useCallback(async () => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) await revokeNotificationDevice(uid).catch(() => undefined);
    generation.current++; setSession(null); setUser(null); setError(''); setErrorStatus(null);
    if (firebaseAuth) await signOut(firebaseAuth);
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, error, errorStatus, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
