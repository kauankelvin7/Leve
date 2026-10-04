import { useEffect, useRef, useState } from 'react';
import { GIKA_MAX_INPUT } from './conversation';

// Narrow types for the native API, which is not declared by lib.dom in all browsers.
type ResultEvent = { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
export type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null; onspeechend: (() => void) | null;
  onresult: ((event: ResultEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionConstructor = new () => Recognition;
export type VoiceState = { status: 'idle' | 'starting' | 'listening' | 'processing' | 'ready' | 'denied' | 'unsupported' | 'error'; message?: string };
export const voiceBusy = (state: VoiceState) => ['starting', 'listening', 'processing'].includes(state.status);

export function nativeRecognition(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined' || !window.isSecureContext) return;
  const policy = (document as Document & { permissionsPolicy?: { allowsFeature(name: string): boolean }; featurePolicy?: { allowsFeature(name: string): boolean } }).permissionsPolicy
    ?? (document as Document & { featurePolicy?: { allowsFeature(name: string): boolean } }).featurePolicy;
  if (policy && !policy.allowsFeature('microphone')) return;
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

/** Recognition produces draft text only. No transport, storage or command authority. */
export function createVoiceInput(Constructor: RecognitionConstructor | undefined, onState: (state: VoiceState) => void, onText: (text: string) => void, getDraft: () => string) {
  let current: Recognition | null = null;
  function detach(recognition: Recognition) {
    recognition.onstart = recognition.onspeechend = recognition.onresult = recognition.onerror = recognition.onend = null;
    if (current === recognition) current = null;
  }
  function cancel(announce = true) {
    const recognition = current;
    if (recognition) { detach(recognition); try { recognition.abort(); } catch { /* Already ended. */ } }
    if (announce) onState({ status: Constructor ? 'idle' : 'unsupported', message: recognition ? 'Captação cancelada. Você pode continuar digitando.' : undefined });
  }
  function start(base: string) {
    if (current) return;
    if (!Constructor) { onState({ status: 'unsupported' }); return; }
    let recognition: Recognition;
    try { recognition = new Constructor(); } catch { onState({ status: 'error', message: 'Não consegui abrir o microfone. Você pode digitar.' }); return; }
    current = recognition;
    let transcript = '';
    const fail = (error: string) => {
      if (current !== recognition) return;
      detach(recognition); try { recognition.abort(); } catch { /* No active capture. */ }
      onState({ status: ['not-allowed', 'service-not-allowed'].includes(error) ? 'denied' : 'error', message: ['not-allowed', 'service-not-allowed'].includes(error)
        ? 'O microfone não foi autorizado. Digite sua pergunta ou libere o acesso no navegador.'
        : 'Não consegui reconhecer sua fala. Tente novamente ou digite.' });
    };
    recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { if (current === recognition) onState({ status: 'listening' }); };
    recognition.onspeechend = () => { if (current === recognition) { onState({ status: 'processing' }); try { recognition.stop(); } catch { fail('capture'); } } };
    recognition.onresult = event => {
      if (current !== recognition) return;
      transcript = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ').trim();
      onState({ status: 'processing' });
    };
    recognition.onerror = event => fail(event.error);
    recognition.onend = () => {
      if (current !== recognition) return;
      detach(recognition);
      const text = `${base}${base && !/\s$/u.test(base) ? ' ' : ''}${transcript}`;
      if (!transcript || getDraft() !== base || text.length > GIKA_MAX_INPUT) {
        onState({ status: 'error', message: getDraft() !== base ? 'O texto mudou. Tente usar voz novamente.' : text.length > GIKA_MAX_INPUT ? 'A fala ficou longa demais. Use uma pergunta mais curta ou digite.' : 'Não ouvi uma pergunta. Tente novamente ou digite.' });
        return;
      }
      onText(text); onState({ status: 'ready' });
    };
    onState({ status: 'starting' });
    try { recognition.start(); } catch (error) { fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'not-allowed' : 'capture'); }
  }
  return { start, cancel, dispose: () => cancel(false) };
}

export function useVoiceInput(active: boolean, draft: string, onDraft: (text: string) => void) {
  const latest = useRef({ active, draft, onDraft }); latest.current = { active, draft, onDraft };
  const [state, setState] = useState<VoiceState>(() => ({ status: nativeRecognition() ? 'idle' : 'unsupported' }));
  const controller = useRef<ReturnType<typeof createVoiceInput> | null>(null);
  if (!controller.current) controller.current = createVoiceInput(nativeRecognition(), setState, text => { if (latest.current.active && navigator.onLine) latest.current.onDraft(text); }, () => latest.current.draft);
  useEffect(() => {
    if (!active) controller.current?.cancel();
    return () => controller.current?.dispose();
  }, [active]);
  return { state, busy: voiceBusy(state), start: () => { if (latest.current.active && navigator.onLine) controller.current?.start(latest.current.draft); }, cancel: () => controller.current?.cancel() };
}
