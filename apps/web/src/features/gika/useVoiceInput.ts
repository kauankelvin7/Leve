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
export type VoiceState = { status: 'idle' | 'starting' | 'listening' | 'processing' | 'ready' | 'denied' | 'unsupported' | 'error'; message?: string; transcript?: string; elapsedSeconds?: number };
export const VOICE_DEADLINES = { start: 15_000, capture: 45_000, processing: 10_000 } as const;
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
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let clock: ReturnType<typeof setInterval> | undefined;
  let previousRecording: { base: string; text: string } | undefined;
  function detach(recognition: Recognition) {
    clearTimeout(deadline); clearInterval(clock);
    deadline = undefined; clock = undefined;
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
    let preview = '';
    let elapsedSeconds = 0;
    let phase: 'starting' | 'listening' | 'processing' = 'starting';
    const original = base;
    if (previousRecording?.text === original) base = previousRecording.base;
    const publish = () => onState({ status: phase, ...(preview ? { transcript: preview } : {}), ...(phase !== 'starting' ? { elapsedSeconds } : {}) });
    const fail = (error: string, message?: string) => {
      if (current !== recognition) return;
      detach(recognition); try { recognition.abort(); } catch { /* No active capture. */ }
      onState({ status: ['not-allowed', 'service-not-allowed'].includes(error) ? 'denied' : 'error', message: message ?? (['not-allowed', 'service-not-allowed'].includes(error)
        ? 'O microfone não foi autorizado. Digite sua pergunta ou libere o acesso no navegador.'
        : 'Não consegui reconhecer sua fala. Tente novamente ou digite.') });
    };
    const processing = () => {
      if (phase !== 'processing') {
        phase = 'processing'; clearInterval(clock); clearTimeout(deadline);
        deadline = setTimeout(() => fail('timeout', 'A transcrição demorou demais. Seu rascunho foi mantido. Tente novamente ou digite.'), VOICE_DEADLINES.processing);
      }
      publish();
    };
    recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (current !== recognition || phase !== 'starting') return;
      phase = 'listening'; clearTimeout(deadline); publish();
      const startedAt = Date.now();
      clock = setInterval(() => { if (current === recognition && phase === 'listening') { elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000); publish(); } }, 1000);
      deadline = setTimeout(() => {
        if (current !== recognition) return;
        processing(); try { recognition.stop(); } catch { fail('capture'); }
      }, VOICE_DEADLINES.capture);
    };
    recognition.onspeechend = () => { if (current === recognition) { processing(); try { recognition.stop(); } catch { fail('capture'); } } };
    recognition.onresult = event => {
      if (current !== recognition) return;
      transcript = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ').trim();
      preview = Array.from(event.results).map(result => result[0].transcript).join(' ').trim().slice(0, GIKA_MAX_INPUT);
      if (Array.from(event.results).some(result => !result.isFinal)) publish();
      else processing();
    };
    recognition.onerror = event => fail(event.error);
    recognition.onend = () => {
      if (current !== recognition) return;
      detach(recognition);
      const text = `${base}${base && !/\s$/u.test(base) ? ' ' : ''}${transcript}`;
      if (!transcript || getDraft() !== original || text.length > GIKA_MAX_INPUT) {
        onState({ status: 'error', message: getDraft() !== original ? 'O texto mudou. Tente usar voz novamente.' : text.length > GIKA_MAX_INPUT ? 'A fala ficou longa demais. Use uma pergunta mais curta ou digite.' : 'Não ouvi uma pergunta. Tente novamente ou digite.' });
        return;
      }
      previousRecording = { base, text };
      onText(text); onState({ status: 'ready' });
    };
    onState({ status: 'starting' });
    deadline = setTimeout(() => fail('timeout', 'O microfone demorou para iniciar. Seu rascunho foi mantido. Tente novamente ou digite.'), VOICE_DEADLINES.start);
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
