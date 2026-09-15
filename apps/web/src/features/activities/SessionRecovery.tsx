import { useEffect, useState } from 'react';
import { useAuth } from '../identity/AuthProvider';
import { findRecoverableSessions, removeUnfinishedSession, sessionTabId, type StoredSession } from './sessionLifecycle';
import { submitActivitySession } from './sessionPersistence';

export function SessionRecovery() {
  const { user } = useAuth();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const scan = () => setSession(user ? findRecoverableSessions(localStorage, undefined, Date.now(), user.uid, sessionTabId())[0] ?? null : null);
    scan();
    const timer = window.setInterval(scan, 5000);
    return () => window.clearInterval(timer);
  }, [user?.uid]);
  if (!session || session.uid !== user?.uid) return null;
  async function register() {
    if (!session || busy) return;
    setBusy(true);
    try { await submitActivitySession(session); setSession(null); setMessage(''); }
    catch { setMessage('Não foi possível registrar agora. A sessão continua salva neste aparelho. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <section className="session-recovery panel" aria-label="Sessão não registrada"><div><p>Você estava em <strong>{session.activityTitle}</strong>. Registrar {Math.floor(session.accumulatedMs / 60_000)} min?</p>{message && <p role="status">{message}</p>}</div><div className="dialog-actions"><button disabled={busy} onClick={() => void register()}>Registrar</button><button disabled={busy} onClick={() => { removeUnfinishedSession(localStorage, session); setSession(null); setMessage(''); }}>Descartar</button></div></section>;
}
