import { useLayoutEffect, useRef, type RefObject } from 'react';
import { GIKA_MAX_INPUT } from './conversation';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  draft: string; open: boolean; loading: boolean; online: boolean;
  onDraft: (text: string) => void; onSend: () => void;
};

export function GikaComposer({ textareaRef, draft, open, loading, online, onDraft, onSend }: Props) {
  const composing = useRef(false);
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

  return <form className="gika-composer" onSubmit={event => { event.preventDefault(); onSend(); }}>
    {!online && <p className="gika-feedback" role="status">A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.</p>}
    <div className="gika-composer-field">
      <label className="visually-hidden" htmlFor="gika-question">Pergunte à Gika</label>
      <textarea id="gika-question" ref={textareaRef} rows={1} maxLength={GIKA_MAX_INPUT} value={draft} onChange={event => onDraft(event.target.value)}
        placeholder="Pergunte à Gika" aria-describedby="gika-composer-hint"
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing) { event.preventDefault(); onSend(); }
        }} />
      <div className="gika-composer-actions">
        <button className="gika-voice" type="button" disabled aria-label="Voz em breve" title="Voz em breve">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6" /></svg>
        </button>
        <button className="gika-send" type="submit" aria-label="Enviar pergunta" title="Enviar pergunta" disabled={!online || loading || !draft.trim()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
        </button>
      </div>
    </div>
    <small id="gika-composer-hint" className="gika-composer-hint">Enter envia · Shift + Enter pula uma linha · Voz em breve</small>
  </form>;
}
