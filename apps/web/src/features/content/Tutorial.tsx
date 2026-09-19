import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../identity/AuthProvider';
import { sendCommand } from '../../platform/api';
import { NotificationSettings } from '../settings/NotificationSettings';
import { Icon } from '../../components/ui/Icon';

export const TUTORIAL_OPEN_EVENT = 'leve:open-tutorial';
const tutorialStorageKey = (uid: string) => `leve.tutorial.completed:${uid}`;

export function requestTutorial() {
  window.dispatchEvent(new Event(TUTORIAL_OPEN_EVENT));
}

const steps = [
  { route: '/hoje', target: '.page-heading', title: 'Seu dia no Leve', text: 'Atividades, calendário, notas e compras ficam no mesmo espaço. Este passeio é curto e você pode pular quando quiser.' },
  { route: '/hoje?nova=1', target: '.activity-composer', title: 'Crie uma atividade', text: 'Dê um título e escolha a data. Em tarefas, o horário é opcional; categoria, cor, lembretes e repetição ficam em Mais opções. Nada é salvo durante o tutorial.' },
  { route: '/calendario', target: '.calendar-panel', title: 'Seu calendário em cores', text: 'O dia recebe a cor da primeira atividade. Os marcadores preservam as cores das demais. Selecione uma data para ler a lista completa.' },
  { route: '/configuracoes#settings-device', target: '.notification-settings', title: 'Lembretes neste aparelho', text: 'Ative avisos para receber lembretes fora do Leve. Em iPhone, pode ser necessário instalar o app na tela inicial antes de permitir notificações.' },
  { route: '/compras', target: '.sidebar nav', title: 'Compras, notas e recuperação', text: 'Crie listas e reutilize modelos em Compras. Recupere exclusões na Lixeira. Aparência, exportação e aparelhos ficam em Preferências. O botão de ajuda continua disponível acima do conteúdo.' },
] as const;

export function Tutorial() {
  const { user, session, refresh } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const [step, setStep] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const active = step === null ? null : steps[step]!;
  useEffect(() => {
    if (!user || !session) return;
    const storageKey = tutorialStorageKey(user.uid);
    if (session.profile?.tutorialCompletedAt) {
      localStorage.setItem(storageKey, 'true');
      setStep(null);
      return;
    }
    if (!localStorage.getItem(storageKey)) setStep(0);
  }, [user?.uid, session?.profile?.tutorialCompletedAt]);
  useEffect(() => {
    const reopen = () => { setMessage(''); setStep(0); };
    window.addEventListener(TUTORIAL_OPEN_EVENT, reopen);
    return () => window.removeEventListener(TUTORIAL_OPEN_EVENT, reopen);
  }, []);
  useEffect(() => {
    if (!active) return;
    navigate(active.route);
  }, [step]);
  useEffect(() => {
    if (!active) return;
    let element: Element | null = null;
    const highlight = () => {
      const target = document.querySelector(active.target);
      if (target === element) return;
      element?.classList.remove('tutorial-highlight'); element = target;
      element?.classList.add('tutorial-highlight');
      element?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    highlight();
    const observer = new MutationObserver(highlight); observer.observe(document.getElementById('main-content')!, { childList: true, subtree: true });
    heading.current?.focus({ preventScroll: true });
    return () => { observer.disconnect(); element?.classList.remove('tutorial-highlight'); };
  }, [step, location.pathname]);
  async function close() {
    setStep(null);
    document.getElementById('page-title')?.focus({ preventScroll: true });
    if (!user) return;
    localStorage.setItem(tutorialStorageKey(user.uid), 'true');
    if (session?.profile?.tutorialCompletedAt) return;
    try { await sendCommand({ command: 'profile.completeTutorial', operationId: crypto.randomUUID(), entityId: user.uid, payload: {} }); await refresh(); }
    catch { setMessage('Não foi possível salvar a conclusão do tutorial. Ele poderá aparecer no próximo acesso.'); }
  }
  return <>{message && <p role="status">{message}</p>}
    {active && createPortal(<aside className="tutorial-card" role="dialog" aria-labelledby="tutorial-title" onKeyDown={event => { if (event.key === 'Escape') void close(); }}>
      <header className="tutorial-card-header"><span>Guia do Leve · {step! + 1} de {steps.length}</span><button type="button" className="icon-button" aria-label="Fechar guia" onClick={() => void close()}><Icon name="close" /></button></header>
      <div className="tutorial-card-content"><h2 id="tutorial-title" ref={heading} tabIndex={-1}>{active.title}</h2><p>{active.text}</p>{step === 3 && <NotificationSettings compact />}</div>
      <div className="tutorial-card-actions"><button type="button" onClick={() => step! > 0 ? setStep(step! - 1) : void close()}>{step! > 0 ? 'Voltar' : 'Pular guia'}</button><button type="button" className="primary" onClick={() => step === steps.length - 1 ? void close() : setStep(step! + 1)}>{step === steps.length - 1 ? 'Concluir guia' : 'Próximo'}</button></div>
    </aside>, document.body)}
  </>;
}
