import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GikaPortrait } from './character/GikaCharacter';
import { useAuth } from '../identity/AuthProvider';
import { firebaseAuth } from '../../platform/firebase';
import './gika.css';

const DAY_DRAFT_EVENT = 'leve:prepare-gika-day';
export function requestDayOrganization(uid: string) {
  window.dispatchEvent(new CustomEvent(DAY_DRAFT_EVENT, { detail: uid }));
}

const loadPanel = () => import('./GikaPanel').then(module => ({ default: module.GikaPanel }));

class GikaBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="gika-load-error" role="alert">
      <p>Não consegui abrir a Gika agora. Sua agenda continua disponível.</p>
      <button type="button" onClick={this.props.onClose}>Fechar e tentar novamente</button>
    </div>;
    return this.props.children;
  }
}

export function GikaLauncher() {
  const { session } = useAuth();
  const [dayDraftRequest, setDayDraftRequest] = useState(0);
  const dayDraftSequence = useRef(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const GikaPanel = useMemo(() => lazy(loadPanel), [attempt]);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prepare = (event: Event) => {
      if (!navigator.onLine) return;
      if ((event as CustomEvent<unknown>).detail !== session?.uid || !session?.uid || firebaseAuth?.currentUser?.uid !== session.uid) return;
      setDayDraftRequest(++dayDraftSequence.current); setLoaded(true); setOpen(true);
    };
    window.addEventListener(DAY_DRAFT_EVENT, prepare);
    return () => window.removeEventListener(DAY_DRAFT_EVENT, prepare);
  }, [session?.uid]);

  function close() { setOpen(false); setDayDraftRequest(0); launcher.current?.focus({ preventScroll: true }); }

  return <>
    <button ref={launcher} type="button" className="gika-launcher" aria-label="Pergunte à Gika" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={loaded ? 'gika-dialog' : undefined}
      onClick={() => { setLoaded(true); setOpen(true); }}>
      <span className="gika-nav-avatar" aria-hidden="true"><GikaPortrait state="rest" /></span><span className="nav-label">Gika</span>
    </button>
    {loaded && <GikaBoundary key={attempt} onClose={() => { close(); setLoaded(false); setAttempt(value => value + 1); }}>
      <Suspense fallback={open ? <div className="gika-load-error" role="status"><p>Abrindo a conversa…</p><button type="button" onClick={close}>Cancelar</button></div> : null}>
        <GikaPanel open={open} onClose={close} dayDraftRequest={dayDraftRequest} />
      </Suspense>
    </GikaBoundary>}
  </>;
}
