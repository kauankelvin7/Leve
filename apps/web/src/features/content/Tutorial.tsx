import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../identity/AuthProvider';
import { sendCommand } from '../../platform/api';
import { NotificationSettings } from '../settings/NotificationSettings';

const steps = [
  { route: '/hoje', target: '.page-heading', title: 'Seu dia no Leve', text: 'Atividades, calendário, notas e compras ficam no mesmo espaço. Este passeio é curto e você pode pular quando quiser.' },
  { route: '/hoje?nova=1', target: '.activity-composer', title: 'Crie uma atividade', text: 'Informe o título, escolha a data e uma cor. Tarefas podem ficar sem horário; compromissos têm início e fim. Nada é salvo durante o tutorial.' },
  { route: '/calendario', target: '.calendar-panel', title: 'Seu calendário em cores', text: 'O dia recebe a cor da primeira atividade. Os marcadores preservam as cores das demais. Selecione uma data para ler a lista completa.' },
  { route: '/configuracoes#settings-device', target: '.notification-settings', title: 'Lembretes neste aparelho', text: 'Ative avisos para receber lembretes fora do Leve. Em iPhone, pode ser necessário instalar o app na tela inicial antes de permitir notificações.' },
  { route: '/compras', target: '.sidebar nav', title: 'Compras, notas e recuperação', text: 'Crie listas e reutilize modelos em Compras. Recupere exclusões na Lixeira. Em Preferências ficam aparência, exportação e aparelhos. Ajuda / Tutorial fica sempre disponível acima do conteúdo.' },
] as const;

export function Tutorial() {
  const { user, session, refresh } = useAuth();
  const navigate = useNavigate(); const location = useLocation();
  const [step, setStep] = useState<number | null>(() => session?.profile?.tutorialCompletedAt ? null : 0);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const active = step === null ? null : steps[step]!;
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
    if (!user || session?.profile?.tutorialCompletedAt) return;
    try { await sendCommand({ command: 'profile.completeTutorial', operationId: crypto.randomUUID(), entityId: user.uid, payload: {} }); await refresh(); }
    catch { setMessage('Não foi possível salvar a conclusão do tutorial. Ele poderá aparecer no próximo acesso.'); }
  }
  return <><button className="tutorial-launch text-button" onClick={() => { setMessage(''); setStep(0); }}>Ajuda / Tutorial</button>{message && <p role="status">{message}</p>}
    {active && <aside className="tutorial-card" role="dialog" aria-label="Tutorial do Leve" onKeyDown={event => { if (event.key === 'Escape') void close(); }}><p className="eyebrow">{step! + 1} de {steps.length}</p><h2 ref={heading} tabIndex={-1}>{active.title}</h2><p>{active.text}</p>{step === 3 && <NotificationSettings compact />}<div className="dialog-actions"><button onClick={() => void close()}>Pular tutorial</button>{step! > 0 && <button onClick={() => setStep(step! - 1)}>Voltar</button>}<button className="primary" onClick={() => step === steps.length - 1 ? void close() : setStep(step! + 1)}>{step === steps.length - 1 ? 'Concluir tutorial' : 'Próximo'}</button></div></aside>}
  </>;
}
