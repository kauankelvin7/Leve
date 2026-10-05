import { useEffect, useReducer, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { GikaMark } from './GikaMark';
import type { GikaAdapter } from './conversation';
import { GikaCharacter, useCharacterPresentation } from './character/GikaCharacter';
import { CharacterEvents } from './character/CharacterEvents';
import { characterActivity, characterState } from './character/controller';
import { useAuth } from '../identity/AuthProvider';
import { GikaComposer } from './GikaComposer';
import { GikaError, GikaLoading, GikaMessage } from './GikaMessage';
import { gikaAdapter, simulated } from './adapter';
import { useGikaConversation } from './useGikaConversation';

type GikaPanelProps = { open: boolean; onClose: () => void; adapter?: GikaAdapter; demo?: boolean; dayDraftRequest?: number };
const demoSuggestions = [
  { text: 'Organizar meu dia', icon: 'day' }, { text: 'Ver minhas pendências', icon: 'list' },
  { text: 'O que tenho amanhã?', icon: 'calendar' }, { text: 'Adicionar uma tarefa', icon: 'plus' },
] as const;

export function GikaPanel({ open, onClose, adapter = gikaAdapter, demo = simulated, dayDraftRequest = 0 }: GikaPanelProps) {
  const { session } = useAuth();
  const presentation = useCharacterPresentation(session?.profile?.reduceMotion ?? false);
  const [activity, notifyCharacter] = useReducer(characterActivity, 'idle');
  const [voiceListening, setVoiceListening] = useState(false);
  const handledDayDraft = useRef(0);
  const [organizationNotice, setOrganizationNotice] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const followTail = useRef(true);
  const lastAssistant = useRef<string | undefined>(undefined);
  const [unseenResponse, setUnseenResponse] = useState(false);
  const conversation = useGikaConversation(adapter);
  const { draft, setDraft, messages, status, errorCode, online, send, cancel, retry } = conversation;

  const latest = messages.at(-1);
  useEffect(() => {
    if (status === 'loading') { notifyCharacter('working'); return; }
    if (status === 'error') { notifyCharacter('error'); return; }
    const outcome = latest?.contextOutcome?.state;
    if (outcome === 'uncertain') { notifyCharacter('error'); return; }
    const acknowledged = latest?.role === 'assistant' && !latest.simulated && (outcome ? outcome === 'confirmed' : Boolean(latest.createdTask || latest.completedTask || latest.updatedTask || latest.createdShoppingList));
    const needsChoice = latest?.role === 'assistant' && !latest.simulated && !outcome && Boolean(latest.confirmation || latest.recurrenceChoice || latest.recurrenceConfirmation || latest.batchConfirmation || [latest.completionResolution, latest.updateResolution, latest.rescheduleResolution].some(item => item?.status === 'clarify' || item?.status === 'ambiguous'));
    notifyCharacter(acknowledged ? 'ack' : needsChoice ? 'clarify' : 'idle');
  }, [status, latest]);
  useEffect(() => {
    if (!open) { notifyCharacter('idle'); setVoiceListening(false); }
    if (activity !== 'success' || !open) return;
    const timer = window.setTimeout(() => notifyCharacter('idle'), 1_200);
    return () => window.clearTimeout(timer);
  }, [activity, open]);
  const visualState = characterState({ open, online, ...presentation, voiceListening, requestPending: status === 'loading', activity });
  const character = <GikaCharacter state={visualState} animate={open && presentation.visible && !presentation.reducedMotion && online} />;

  useEffect(() => {
    if (!open || !dayDraftRequest || handledDayDraft.current === dayDraftRequest) return;
    handledDayDraft.current = dayDraftRequest;
    setOrganizationNotice(draft.trim() ? 'Seu rascunho foi mantido. Para pedir uma sugestão, envie “Organiza meu dia”.' : 'Revise o pedido antes de enviar.');
    if (!draft.trim()) setDraft('Organiza meu dia');
    composer.current?.focus({ preventScroll: true });
  }, [open, dayDraftRequest, draft, setDraft]);

  const suggestions = demo ? demoSuggestions : [
    { text: 'O que tenho hoje?', icon: 'day' }, { text: 'Organizar meu dia', icon: 'calendar' },
    { text: 'Como você pode ajudar?', icon: 'list' }, { text: 'Adicionar uma tarefa', icon: 'plus' },
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
    const latestAssistant = messages.findLast(message => message.role === 'assistant')?.id;
    if (open && transcript.current) {
      if (followTail.current) transcript.current.scrollTop = messages.length ? transcript.current.scrollHeight : 0;
      else if (latestAssistant && latestAssistant !== lastAssistant.current) setUnseenResponse(true);
    }
    lastAssistant.current = latestAssistant;
  }, [open, messages, status]);

  function followLatest() {
    followTail.current = true; setUnseenResponse(false);
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }

  function submit() {
    followLatest(); setOrganizationNotice(null); void send();
  }

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

  return <CharacterEvents.Provider value={notifyCharacter}><dialog ref={dialog} id="gika-dialog" className="gika-panel glass glass-strong" aria-labelledby="gika-title" aria-describedby="gika-demo-notice"
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
      <div className="gika-identity">{messages.length ? character : <span className="gika-identity-mark"><GikaMark /></span>}<div><h2 id="gika-title">Gika</h2><p className="gika-kicker">Sua assistente de agenda</p></div></div>
      <button type="button" className="gika-close" aria-label="Fechar Gika" onClick={close}><Icon name="close" /></button>
    </header>
    <p className="gika-demo-notice" id="gika-demo-notice">{demo ? 'Demonstração · as respostas são simuladas. Sua agenda não muda.' : organizationNotice ?? 'Converse sobre sua agenda ou peça ajuda para organizar o dia.'}</p>
    <div className="gika-transcript"><div className={`gika-content${messages.length === 0 ? ' is-empty' : ''}`} ref={transcript} role="region" aria-label="Conversa com Gika" tabIndex={0} onScroll={event => {
      const element = event.currentTarget;
      followTail.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 48;
      if (followTail.current) setUnseenResponse(false);
    }}>
      {messages.length === 0 && <div className="gika-welcome">
        <span className="gika-welcome-mark" aria-hidden="true">{character}</span><h3>{demo ? 'O que vamos organizar?' : 'Como posso te ajudar hoje?'}</h3><p>{demo ? 'Pergunte sobre seu dia ou peça para adicionar uma tarefa.' : 'Veja sua agenda, organize pendências ou me conte o que precisa.'}</p>
        <div className="gika-suggestions" aria-label="Sugestões de perguntas">{suggestions.map(({ text, icon }) => <button type="button" key={text}
          disabled={status === 'loading'} onClick={() => { setDraft(text); composer.current?.focus({ preventScroll: true }); }}><Icon name={icon} /><span>{text}</span></button>)}</div>
      </div>}
      <ol className="gika-messages" aria-label="Mensagens da conversa">{messages.map((message,index) => <GikaMessage key={message.id} message={message} onOpenList={close} onOutcome={conversation.recordOutcome} active={open} online={online} superseded={Boolean(message.batchConfirmation?.plan.organization) && (draft.trim().length > 0 || messages.slice(index + 1).some(item=>item.role==='user'))} />)}</ol>
      {status === 'loading' && <GikaLoading demo={demo} />}
      {status === 'error' && <GikaError code={errorCode} online={online} onRetry={() => void retry()} />}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{status === 'loading' ? (demo ? 'Preparando uma resposta de demonstração…' : 'Preparando uma resposta…') : status === 'error' ? 'Não consegui responder agora. Tente novamente em alguns instantes.' : messages.at(-1)?.role === 'assistant' ? messages.at(-1)?.text : ''}</div>
    </div>{unseenResponse && <button type="button" className="gika-latest" onClick={() => { followLatest(); composer.current?.focus({ preventScroll: true }); }}>Ver resposta</button>}</div>
    <GikaComposer textareaRef={composer} draft={draft} open={open} loading={status === 'loading'} online={online} onDraft={setDraft} onVoiceListening={setVoiceListening} onSend={submit} onCancelResponse={cancel} />
  </dialog></CharacterEvents.Provider>;
}
