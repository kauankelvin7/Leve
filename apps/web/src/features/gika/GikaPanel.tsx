import { useEffect, useRef } from 'react';
import { Icon } from '../../components/ui/Icon';

type GikaPanelProps = { open: boolean; onClose: () => void };

export function GikaPanel({ open, onClose }: GikaPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  return <dialog ref={dialog} id="gika-dialog" className="gika-panel" aria-labelledby="gika-title" aria-describedby="gika-demo-notice"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <header className="gika-heading">
      <div><p className="gika-kicker">Sua assistente de agenda</p><h2 id="gika-title">Gika</h2></div>
      <button type="button" className="gika-close" aria-label="Fechar Gika" onClick={onClose} autoFocus><Icon name="close" /></button>
    </header>
    <div className="gika-content">
      <p className="gika-demo-notice" id="gika-demo-notice">Demonstração: as respostas são simuladas e não alteram sua agenda.</p>
      <div className="gika-welcome"><Icon name="day" /><h3>O que vamos organizar?</h3><p>A conversa estará disponível em breve. Você pode continuar usando sua agenda.</p></div>
    </div>
  </dialog>;
}
