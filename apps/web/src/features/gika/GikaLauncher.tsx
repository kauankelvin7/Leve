import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { GikaMark } from './GikaMark';
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
  const { pathname } = useLocation();
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

  // The timer is portaled to body and can grow when it displays an error.
  // Measure dock heights and keep the conventional footer reachable while scrolling.
  useEffect(() => {
    const button = launcher.current;
    if (!button) return;
    const update = () => {
      const width = button.getBoundingClientRect();
      let bottom = window.innerWidth <= 739 ? 82 : 24;
      for (const obstacle of document.querySelectorAll('.active-timer-bar, .active-timer-error-bar, .sidebar, .page-footer')) {
        if (obstacle.matches('.sidebar') && window.innerWidth > 739) continue;
        // Footer padding is available space, not an interactive obstacle.
        // Reserving the whole box pushed the launcher onto short-list actions.
        const rect = (obstacle.matches('.page-footer') ? obstacle.querySelector('button') ?? obstacle : obstacle).getBoundingClientRect();
        if (obstacle.matches('.page-footer') && (rect.top >= window.innerHeight || rect.bottom <= window.innerHeight - bottom - width.height - 12)) continue;
        if (rect.height && rect.right > width.left && rect.left < width.right) bottom = Math.max(bottom, window.innerHeight - rect.top + 12);
      }
      button.style.setProperty('--gika-dock-bottom', `${bottom}px`);
    };
    const resize = new ResizeObserver(update);
    const observe = () => {
      resize.disconnect();
      document.querySelectorAll('.active-timer-bar, .active-timer-error-bar, .sidebar, .page-footer').forEach(element => resize.observe(element));
      update();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    observe();
    return () => { resize.disconnect(); mutations.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [pathname]);

  function close() { setOpen(false); setDayDraftRequest(0); launcher.current?.focus({ preventScroll: true }); }

  return <>
    <button ref={launcher} type="button" className="gika-launcher" data-calendar={pathname === '/calendario' ? 'true' : undefined} aria-label="Pergunte à Gika" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={loaded ? 'gika-dialog' : undefined}
      onClick={() => { setLoaded(true); setOpen(true); }}>
      <GikaMark /><span>Gika</span>
    </button>
    {loaded && <GikaBoundary key={attempt} onClose={() => { close(); setLoaded(false); setAttempt(value => value + 1); }}>
      <Suspense fallback={open ? <div className="gika-load-error" role="status"><p>Abrindo a conversa…</p><button type="button" onClick={close}>Cancelar</button></div> : null}>
        <GikaPanel open={open} onClose={close} dayDraftRequest={dayDraftRequest} />
      </Suspense>
    </GikaBoundary>}
  </>;
}
