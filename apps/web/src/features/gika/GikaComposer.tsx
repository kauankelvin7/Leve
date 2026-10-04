import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { GIKA_MAX_INPUT } from './conversation';
import { useVoiceInput } from './useVoiceInput';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  draft: string; open: boolean; loading: boolean; online: boolean;
  onVoiceListening?: (listening: boolean) => void;
  onDraft: (text: string) => void; onSend: () => void;
};

export function GikaComposer({ textareaRef, draft, open, loading, online, onDraft, onSend, onVoiceListening }: Props) {
  const composing = useRef(false);
  const voice = useVoiceInput(open && online && !loading, draft, onDraft);
  useEffect(() => { onVoiceListening?.(voice.state.status === 'listening'); }, [voice.state.status, onVoiceListening]);
  const voiceText = voice.state.message ?? ({ idle: '', starting: 'Preparando o microfone…', listening: 'Ouvindo…', processing: 'Preparando o texto…', ready: 'Texto pronto. Revise e envie quando quiser.', denied: 'O microfone não foi autorizado. Você pode digitar.', unsupported: 'Voz não disponível neste navegador. Digite sua pergunta.', error: 'Não consegui reconhecer sua fala. Você pode digitar.' }[voice.state.status]);
  function submit() { if (!voice.busy) onSend(); }
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
    {!online && <p className="gika-feedback" role="status">A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.</p>}
    <div className="gika-composer-field">
      <label className="visually-hidden" htmlFor="gika-question">Pergunte à Gika</label>
      <textarea id="gika-question" ref={textareaRef} rows={1} maxLength={GIKA_MAX_INPUT} value={draft} onChange={event => onDraft(event.target.value)} readOnly={voice.busy}
        placeholder="Pergunte à Gika" aria-describedby="gika-composer-hint gika-voice-status"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
        }} />
      <div className="gika-composer-actions">
        <button className="gika-voice" type="button" disabled={!online || loading || voice.state.status === 'unsupported'} aria-label={voice.busy ? 'Cancelar voz' : 'Usar voz'} title={voice.busy ? 'Cancelar voz' : 'Usar voz'} aria-pressed={voice.busy} aria-describedby="gika-voice-status" onClick={() => voice.busy ? voice.cancel() : voice.start()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6" /></svg>
        </button>
        <button className="gika-send" type="submit" aria-label="Enviar pergunta" title="Enviar pergunta" disabled={!online || loading || voice.busy || !draft.trim()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
        </button>
      </div>
    </div>
    <p id="gika-voice-status" className="gika-voice-hint" role="status" aria-live="polite">{voiceText}</p>
    <small id="gika-composer-hint" className="gika-composer-hint">Enter envia · Shift + Enter pula uma linha</small>
  </form>;
}
