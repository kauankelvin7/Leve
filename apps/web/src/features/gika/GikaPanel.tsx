import { useEffect, useRef } from 'react';
import { Icon } from '../../components/ui/Icon';
import { GIKA_MAX_INPUT, unavailableAdapter, type GikaAdapter } from './conversation';
import { useGikaConversation } from './useGikaConversation';

type GikaPanelProps = { open: boolean; onClose: () => void; adapter?: GikaAdapter };
const suggestions = ['Organizar meu dia', 'Ver minhas pendências', 'O que tenho amanhã?', 'Adicionar uma tarefa'];

export function GikaPanel({ open, onClose, adapter = unavailableAdapter }: GikaPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const conversation = useGikaConversation(adapter);
  const composing = useRef(false);
  const { draft, setDraft, messages, status, online, send, cancel, retry } = conversation;

  function close() { cancel(); onClose(); }

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    composer.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (open && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [open, messages.length, status]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      dialog.current?.style.setProperty('--gika-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      dialog.current?.style.setProperty('--gika-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update); update();
    return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  return <dialog ref={dialog} id="gika-dialog" className="gika-panel" aria-labelledby="gika-title" aria-describedby="gika-demo-notice"
    onCancel={event => { event.preventDefault(); close(); }}
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
      <button type="button" className="gika-close" aria-label="Fechar Gika" onClick={close}><Icon name="close" /></button>
    </header>
    <div className="gika-content" ref={transcript}>
      <p className="gika-demo-notice" id="gika-demo-notice">Demonstração: as respostas são simuladas e não alteram sua agenda.</p>
      {messages.length === 0 && <div className="gika-welcome"><Icon name="day" /><h3>O que vamos organizar?</h3><p>Escolha uma sugestão ou escreva sua pergunta.</p></div>}
      <div className="gika-suggestions" aria-label="Sugestões de perguntas">{suggestions.map(text => <button type="button" key={text}
        disabled={status === 'loading'} onClick={() => { setDraft(text); composer.current?.focus(); }}>{text}</button>)}</div>
      <ol className="gika-messages" aria-label="Conversa com Gika">{messages.map(message => <li key={message.id} className={`gika-message is-${message.role}`}>
        <span className="gika-message-author">{message.role === 'user' ? 'Você' : 'Resposta de demonstração'}</span><p>{message.text}</p>
      </li>)}</ol>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status === 'loading' ? 'Preparando uma resposta de demonstração…' : status === 'error' ? 'Não consegui responder agora. Tente novamente em alguns instantes.' : messages.at(-1)?.role === 'assistant' ? messages.at(-1)?.text : ''}</div>
    </div>
    <form className="gika-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
      {!online && <p className="gika-feedback" role="status">A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.</p>}
      {status === 'loading' && <p className="gika-feedback">Preparando uma resposta de demonstração…</p>}
      {status === 'error' && <div className="gika-feedback is-error"><p>Não consegui responder agora. Tente novamente em alguns instantes.</p><button type="button" disabled={!online} onClick={() => void retry()}>Tentar novamente</button></div>}
      <label htmlFor="gika-question">Pergunte à Gika</label>
      <textarea id="gika-question" ref={composer} rows={2} maxLength={GIKA_MAX_INPUT} value={draft} onChange={event => setDraft(event.target.value)}
        placeholder="Por exemplo: o que tenho amanhã?" aria-describedby="gika-composer-hint"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
        }} />
      <div className="gika-composer-actions"><small id="gika-composer-hint">Enter envia. Shift + Enter pula uma linha.</small><button type="submit" disabled={!online || status === 'loading' || !draft.trim()}>Enviar pergunta</button></div>
    </form>
  </dialog>;
}
