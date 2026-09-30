import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GikaMark } from './GikaMark';
import './gika.css';

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
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const GikaPanel = useMemo(() => lazy(loadPanel), [attempt]);
  const launcher = useRef<HTMLButtonElement>(null);

  // The timer is portaled to body and can grow when it displays an error.
  // Measure actual dock heights rather than assuming a fixed timer size.
  useEffect(() => {
    const button = launcher.current;
    if (!button) return;
    const update = () => {
      const width = button.getBoundingClientRect();
      let bottom = window.innerWidth <= 739 ? 82 : 24;
      for (const obstacle of document.querySelectorAll('.active-timer-bar, .active-timer-error-bar, .sidebar')) {
        if (obstacle.matches('.sidebar') && window.innerWidth > 739) continue;
        const rect = obstacle.getBoundingClientRect();
        if (rect.height && rect.right > width.left && rect.left < width.right) bottom = Math.max(bottom, window.innerHeight - rect.top + 12);
      }
      button.style.setProperty('--gika-dock-bottom', `${bottom}px`);
    };
    const resize = new ResizeObserver(update);
    const observe = () => {
      resize.disconnect();
      document.querySelectorAll('.active-timer-bar, .active-timer-error-bar, .sidebar').forEach(element => resize.observe(element));
      update();
    };
    const mutations = new MutationObserver(observe);
    mutations.observe(document.body, { childList: true });
    window.addEventListener('resize', update);
    observe();
    return () => { resize.disconnect(); mutations.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  function close() { setOpen(false); launcher.current?.focus({ preventScroll: true }); }

  return <>
    <button ref={launcher} type="button" className="gika-launcher" aria-label="Pergunte à Gika" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={loaded ? 'gika-dialog' : undefined}
      onClick={() => { setLoaded(true); setOpen(true); }}>
      <GikaMark /><span>Gika</span>
    </button>
    {loaded && <GikaBoundary key={attempt} onClose={() => { close(); setLoaded(false); setAttempt(value => value + 1); }}>
      <Suspense fallback={open ? <div className="gika-load-error" role="status"><p>Abrindo a conversa…</p><button type="button" onClick={close}>Cancelar</button></div> : null}>
        <GikaPanel open={open} onClose={close} />
      </Suspense>
    </GikaBoundary>}
  </>;
}
