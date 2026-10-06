import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { GIKA_MAX_INPUT } from './conversation';
import { useVoiceInput } from './useVoiceInput';
import { Icon } from '../../components/ui/Icon';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  draft: string; open: boolean; loading: boolean; online: boolean;
  onVoiceListening?: (listening: boolean) => void;
  onDraft: (text: string) => void; onSend: () => void; onCancelResponse?: () => void;
};

export function GikaComposer({ textareaRef, draft, open, loading, online, onDraft, onSend, onVoiceListening, onCancelResponse }: Props) {
  const composing = useRef(false);
  const voice = useVoiceInput(open && online && !loading, draft, onDraft);
  useEffect(() => { onVoiceListening?.(voice.state.status === 'listening'); }, [voice.state.status, onVoiceListening]);
  const voiceText = voice.state.message ?? ({ idle: '', starting: 'Preparando o microfone…', listening: 'Ouvindo…', processing: 'Preparando o texto…', ready: 'Texto pronto. Revise e envie quando quiser.', denied: 'O microfone não foi autorizado. Você pode digitar.', unsupported: 'Voz não disponível neste navegador. Digite sua pergunta.', error: 'Não consegui reconhecer sua fala. Você pode digitar.' }[voice.state.status]);
  const voiceLabel = voice.busy ? 'Cancelar voz' : voice.state.status === 'ready' ? 'Gravar novamente' : 'Usar voz';
  function submit() { if (!voice.busy && !loading) onSend(); }
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!open || !element) return;
    const resize = () => {
      element.style.height = '0px';
      const maximum = parseFloat(getComputedStyle(element).maxHeight);
      element.style.height = `${Math.min(element.scrollHeight, maximum)}px`;
    };
    resize();
    // The parent opens the native dialog after child layout effects run.
    const frame = requestAnimationFrame(resize);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [draft, open, textareaRef]);

  return <form className="gika-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
    {!online && <div className="gika-feedback is-offline" role="status"><div className="gika-feedback-title"><Icon name="question" /><strong>Sem conexão</strong></div><p>A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.</p></div>}
    <div className="gika-composer-field">
      <label className="visually-hidden" htmlFor="gika-question">Pergunte à Gika</label>
      <textarea id="gika-question" ref={textareaRef} rows={1} maxLength={GIKA_MAX_INPUT} value={draft} onChange={event => onDraft(event.target.value)} readOnly={voice.busy}
        placeholder="Pergunte à Gika" aria-describedby="gika-composer-hint gika-voice-status"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
        }} />
      <div className="gika-composer-actions">
        {loading && onCancelResponse ? <button className="gika-stop" type="button" aria-label="Parar resposta" title="Parar resposta" aria-describedby="gika-composer-hint" onClick={event => { event.preventDefault(); onCancelResponse(); textareaRef.current?.focus({ preventScroll: true }); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
        </button> : <button className="gika-voice" type="button" disabled={!online || loading || voice.state.status === 'unsupported'} aria-label={voiceLabel} title={voiceLabel} aria-pressed={voice.busy} aria-describedby="gika-voice-status" onClick={() => voice.busy ? voice.cancel() : voice.start()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6" /></svg>
        </button>}
        <button className="gika-send" type="submit" aria-label="Enviar pergunta" title="Enviar pergunta" disabled={!online || loading || voice.busy || !draft.trim()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
        </button>
      </div>
    </div>
    {voice.state.transcript && <div className="gika-voice-preview" role="region" aria-label="Transcrição da voz" tabIndex={0}>{voice.state.transcript}</div>}
    <div className="gika-voice-feedback"><p id="gika-voice-status" className="gika-voice-hint" role="status" aria-live="polite">{voiceText}</p>{voice.busy && voice.state.elapsedSeconds !== undefined && <span className="gika-voice-time" role="timer" aria-label="Tempo de captação">{Math.floor(voice.state.elapsedSeconds / 60)}:{String(voice.state.elapsedSeconds % 60).padStart(2, '0')}</span>}</div>
    <small id="gika-composer-hint" className="gika-composer-hint">{loading ? 'Parar a resposta não desfaz alterações já enviadas.' : 'Enter envia · Shift + Enter pula uma linha'}</small>
  </form>;
}
