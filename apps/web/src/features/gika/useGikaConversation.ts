import { useEffect, useRef, useState } from 'react';
import { GIKA_MAX_INPUT, GIKA_MAX_MESSAGES, gikaResponseSchema, type GikaAdapter, type GikaMessage, type GikaRequest } from './conversation';

export function useGikaConversation(adapter: GikaAdapter) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<GikaMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [online, setOnline] = useState(() => navigator.onLine);
  const pending = useRef<GikaRequest | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) { controller.current?.abort(); controller.current = null; setStatus('idle'); }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); controller.current?.abort(); };
  }, []);

  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setStatus('idle');
  }

  async function send(text = draft) {
    const trimmed = text.trim();
    if (!navigator.onLine || controller.current || !trimmed || trimmed.length > GIKA_MAX_INPUT) return;
    if (!pending.current || pending.current.text !== trimmed) {
      pending.current = { requestId: crypto.randomUUID(), text: trimmed };
      const request = pending.current;
      setMessages(current => [...current, { id: request.requestId, role: 'user' as const, text: trimmed }].slice(-GIKA_MAX_MESSAGES));
    }
    const request = pending.current;
    const active = new AbortController();
    controller.current = active;
    setStatus('loading');
    try {
      const response = gikaResponseSchema.parse(await adapter(request, active.signal));
      if (active.signal.aborted || controller.current !== active) return;
      setMessages(current => [...current, { id: `${request.requestId}:response`, role: 'assistant' as const, text: response.text }].slice(-GIKA_MAX_MESSAGES));
      setDraft(current => current.trim() === trimmed ? '' : current);
      pending.current = null;
      setStatus('idle');
    } catch {
      if (!active.signal.aborted && controller.current === active) setStatus('error');
    } finally {
      if (controller.current === active) controller.current = null;
    }
  }

  return { draft, setDraft, messages, status, online, send, cancel, retry: () => pending.current ? send(pending.current.text) : Promise.resolve() };
}
