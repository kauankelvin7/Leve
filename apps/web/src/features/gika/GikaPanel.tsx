import { useEffect, useRef } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { GikaAdapter } from './conversation';
import { GikaMark } from './GikaMark';
import { GikaComposer } from './GikaComposer';
import { GikaError, GikaLoading, GikaMessage } from './GikaMessage';
import { gikaAdapter, simulated } from './adapter';
import { useGikaConversation } from './useGikaConversation';

type GikaPanelProps = { open: boolean; onClose: () => void; adapter?: GikaAdapter; demo?: boolean };
const demoSuggestions = [
  { text: 'Organizar meu dia', icon: 'day' }, { text: 'Ver minhas pendências', icon: 'list' },
  { text: 'O que tenho amanhã?', icon: 'calendar' }, { text: 'Adicionar uma tarefa', icon: 'plus' },
] as const;

export function GikaPanel({ open, onClose, adapter = gikaAdapter, demo = simulated }: GikaPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const conversation = useGikaConversation(adapter);
  const { draft, setDraft, messages, status, errorCode, online, send, cancel, retry } = conversation;

  const suggestions = demo ? demoSuggestions : [
    { text: 'O que tenho hoje?', icon: 'day' }, { text: 'O que tenho amanhã?', icon: 'calendar' },
    { text: 'Ver minha semana', icon: 'list' }, { text: 'Adicionar uma tarefa', icon: 'plus' },
  ] as const;

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
    if (open && transcript.current) transcript.current.scrollTop = messages.length ? transcript.current.scrollHeight : 0;
  }, [open, messages.length, status]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      dialog.current?.style.setProperty('--gika-viewport-height', `${height}px`);
      dialog.current?.style.setProperty('--gika-viewport-top', `${viewport?.offsetTop ?? 0}px`);
      if (dialog.current) dialog.current.dataset.compact = String(height < 500);
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
      <div className="gika-identity"><span className="gika-identity-mark"><GikaMark /></span><div><h2 id="gika-title">Gika</h2><p className="gika-kicker">Sua assistente de agenda</p></div></div>
      <button type="button" className="gika-close" aria-label="Fechar Gika" onClick={close}><Icon name="close" /></button>
    </header>
    <p className="gika-demo-notice" id="gika-demo-notice">{demo ? 'Demonstração · as respostas são simuladas. Sua agenda não muda.' : 'Consulte sua agenda ou adicione uma tarefa.'}</p>
    <div className={`gika-content${messages.length === 0 ? ' is-empty' : ''}`} ref={transcript} role="region" aria-label="Conversa com Gika" tabIndex={0}>
      {messages.length === 0 && <div className="gika-welcome">
        <span className="gika-welcome-mark"><GikaMark /></span><h3>{demo ? 'O que vamos organizar?' : 'O que você quer consultar?'}</h3><p>Pergunte sobre seu dia ou peça para adicionar uma tarefa.</p>
        <div className="gika-suggestions" aria-label="Sugestões de perguntas">{suggestions.map(({ text, icon }) => <button type="button" key={text}
          disabled={status === 'loading'} onClick={() => { setDraft(text); composer.current?.focus({ preventScroll: true }); }}><Icon name={icon} /><span>{text}</span></button>)}</div>
      </div>}
      <ol className="gika-messages" aria-label="Mensagens da conversa">{messages.map(message => <GikaMessage key={message.id} message={message} active={open} />)}</ol>
      {status === 'loading' && <GikaLoading demo={demo} />}
      {status === 'error' && <GikaError code={errorCode} online={online} onRetry={() => void retry()} />}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status === 'loading' ? (demo ? 'Preparando uma resposta de demonstração…' : 'Consultando sua agenda…') : status === 'error' ? 'Não consegui responder agora. Tente novamente em alguns instantes.' : messages.at(-1)?.role === 'assistant' ? messages.at(-1)?.text : ''}</div>
    </div>
    <GikaComposer textareaRef={composer} draft={draft} open={open} loading={status === 'loading'} online={online} onDraft={setDraft} onSend={() => void send()} />
  </dialog>;
}
