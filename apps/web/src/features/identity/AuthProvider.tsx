import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SessionResult } from '../../../../../packages/domain/src/identity';
import { activateOfflinePersistenceForAccount, clearFirestorePersistence, ensureFirestorePrivacy, firebaseAuth, firestore } from '../../platform/firebase';
import { cacheSession, clearCachedSession, clearLocalData, localWorkCounts, localWorkDescription, readCachedSession } from '../../platform/outbox';
import { setOfflineAccount, cleanupWarning, markCleanupFailure, clearCleanupWarning } from '../../platform/offlinePreference';
import { ApiError, apiRequest } from '../../platform/api';
import { revokeNotificationDevice } from '../../platform/notifications';
import { clearQueryCache } from '../content/useLiveQueries';
import { applyColorTheme, applyAppearance, storedAppearance } from '../../platform/theme';

type AuthState = { user: User | null; session: SessionResult | null; loading: boolean; error: string; errorStatus: number | null; refresh: () => Promise<void>; logout: (options?: { discardConfirmed?: boolean; expectedFingerprint?: string }) => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const generation = useRef(0);
  const previousUid = useRef<string | null>(localStorage.getItem('leve.offlineAccount'));
  const revokedUid = useRef<string | null>(null);
  const authTransition = useRef<Promise<void>>(Promise.resolve());
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
      try { await ensureFirestorePrivacy(); } catch { throw new ApiError(503, 'LOCAL_PRIVACY_CLEANUP', cleanupWarning()); }
      const result = await apiRequest<SessionResult>('/session', {}, currentUser.uid);
      if (currentGeneration !== generation.current || firebaseAuth?.currentUser?.uid !== currentUser.uid || revokedUid.current === currentUser.uid) return;
      await cacheSession(currentUser.uid, result).catch(() => undefined);
      if (currentGeneration !== generation.current || firebaseAuth?.currentUser?.uid !== currentUser.uid) { await clearCachedSession(currentUser.uid); return; }
      if (currentGeneration === generation.current && firebaseAuth?.currentUser?.uid === currentUser.uid) { setSession(result); setError(''); setErrorStatus(null); }
    } catch (failure) {
      if (currentGeneration === generation.current) {
        if (failure instanceof ApiError && (failure.status === 401 || failure.status === 403)) { revokedUid.current = currentUser.uid; await clearCachedSession(currentUser.uid).catch(() => { markCleanupFailure(); }); await clearFirestorePersistence().catch(() => { markCleanupFailure(); }); }
        const cached = revokedUid.current !== currentUser.uid && failure instanceof ApiError && failure.code === 'NETWORK_ERROR' ? await readCachedSession(currentUser.uid).catch(() => null) : null;
        if (currentGeneration !== generation.current || firebaseAuth?.currentUser?.uid !== currentUser.uid) return;
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
      ++generation.current;
      clearQueryCache(); setSession(null); setLoading(Boolean(currentUser));
      authTransition.current = authTransition.current.then(async () => {
        if (firebaseAuth?.currentUser?.uid !== currentUser?.uid) return;
        const previous = previousUid.current;
        previousUid.current = currentUser?.uid ?? null;
        setOfflineAccount(currentUser?.uid ?? null);
        if (previous && previous !== currentUser?.uid) {
          await clearCachedSession(previous).catch(() => { markCleanupFailure(); });
          try { if (await clearFirestorePersistence()) { window.location.reload(); return; } }
          catch { setError(cleanupWarning()); setErrorStatus(503); setLoading(false); return; }
        }
        if (currentUser && await activateOfflinePersistenceForAccount(currentUser.uid)) return;
        if (previous !== currentUser?.uid) revokedUid.current = null;
        setUser(currentUser); setError(cleanupWarning()); setErrorStatus(null);
        if (currentUser?.emailVerified) await refresh();
        else setLoading(false);
      }).catch(() => { markCleanupFailure(); setSession(null); setError(cleanupWarning()); setErrorStatus(503); setLoading(false); });
    });
  }, [refresh]);

  useEffect(() => {
    if (!user || !firestore || session?.membership !== 'active') return;
    return onSnapshot(doc(firestore, 'memberships', user.uid), snapshot => {
      if (!snapshot.metadata.fromCache && snapshot.data()?.state !== 'active') {
        revokedUid.current = user.uid; ++generation.current; setSession(null); clearQueryCache();
        void clearCachedSession(user.uid).then(clearFirestorePersistence).then(() => refresh()).catch(() => { markCleanupFailure(); setError(cleanupWarning()); setErrorStatus(503); });
      }
    }, failure => {
      // Releasing Firestore persistence during an explicit local-data cleanup
      // cancels this listener. That expected shutdown must not replace the
      // settings screen with an authorization outage.
      if (failure.code === 'cancelled') return;
      if (navigator.onLine) { setError('Não foi possível verificar o acesso à conta.'); setErrorStatus(503); }
    });
  }, [user, session?.membership, refresh]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const message = { type: 'LEVE_AUTH_CONTEXT', uid: user?.uid ?? null };
    navigator.serviceWorker.controller?.postMessage(message);
    void navigator.serviceWorker.ready.then(registration => registration.active?.postMessage(message)).catch(() => undefined);
  }, [user?.uid]);

  const logout = useCallback(async (options: { discardConfirmed?: boolean; expectedFingerprint?: string } = {}) => {
    const uid = firebaseAuth?.currentUser?.uid;
    const work = uid ? await localWorkCounts(uid).catch(() => { markCleanupFailure(); return null; }) : null;
    if (uid && !work && !options.discardConfirmed && !window.confirm('Não foi possível verificar os dados deste aparelho. Ao sair, eles podem permanecer salvos aqui. Quer continuar?')) return;
    const confirmationMatches = Boolean(work && options.discardConfirmed && options.expectedFingerprint === work.fingerprint);
    if (uid && work && (work.pending || work.drafts) && !confirmationMatches) {
      if ((work.pending || work.drafts) && !window.confirm(`Ao sair, o Leve removerá ${localWorkDescription(work)} deste aparelho. O que ainda não foi enviado será perdido. Quer sair mesmo assim?`)) return;
    }
    generation.current++; revokedUid.current = uid ?? null;
    clearQueryCache(); setSession(null);
    if (uid) await revokeNotificationDevice(uid).catch(() => undefined);
    let persistenceCleared = false;
    try {
      persistenceCleared = await clearFirestorePersistence();
      if (uid && work) await clearLocalData(uid, { discardUserWork: true, expectedFingerprint: work.fingerprint }).catch(failure => { markCleanupFailure('work'); throw failure; });
      if (work) clearCleanupWarning(true);
    } catch { markCleanupFailure(); }
    previousUid.current = null; setOfflineAccount(null);
    setUser(null); setError(cleanupWarning()); setErrorStatus(null);
    if (firebaseAuth) await signOut(firebaseAuth);
    if (persistenceCleared) window.location.reload();
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, error, errorStatus, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
