import { useEffect, useRef, useState } from 'react';
import { firebaseAuth } from '../../platform/firebase';
import { ApiError } from '../../platform/api';
import { GIKA_MAX_INPUT, GIKA_MAX_MESSAGES, gikaResponseSchema, type GikaAdapter, type GikaMessage, type GikaRequest } from './conversation';

export function useGikaConversation(adapter: GikaAdapter) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<GikaMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<string | undefined>();
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
    const originatingUid = firebaseAuth?.currentUser?.uid;
    const active = new AbortController();
    controller.current = active;
    setStatus('loading'); setErrorCode(undefined);
    try {
      const response = gikaResponseSchema.parse(await adapter(request, active.signal));
      if (active.signal.aborted || controller.current !== active) return;
      setMessages(current => [...current, { id: `${request.requestId}:response`, role: 'assistant' as const, text: response.text, simulated: response.simulated, ...(response.simulated ? { preview: response.preview } : { reads: response.reads, createdTask: response.createdTask, completedTask: response.completedTask, completionResolution: response.completionResolution, updatedTask: response.updatedTask, updateResolution: response.updateResolution, rescheduleTask: response.rescheduleTask, confirmation: response.confirmation, rescheduleResolution: response.rescheduleResolution, recurrenceChoice: response.recurrenceChoice, recurrenceConfirmation: response.recurrenceConfirmation, ...((response.rescheduleTask || response.recurrenceChoice || response.recurrenceConfirmation) && originatingUid ? { rescheduleContext: { uid: originatingUid, request } } : {}), ...(response.createdTask && originatingUid && response.createdTask.id === request.requestId ? { creationUndo: { uid: originatingUid, creationOperationId: request.requestId, entityId: response.createdTask.id, revision: 1 as const } } : {}) }) }].slice(-GIKA_MAX_MESSAGES));
      setDraft(current => current.trim() === trimmed ? '' : current);
      pending.current = null;
      setStatus('idle');
    } catch (error) {
      if (!active.signal.aborted && controller.current === active) { if (error instanceof ApiError && (error.code === 'REVISION_CONFLICT' || error.code === 'GIKA_UPDATE_CONFLICT')) pending.current = null; setErrorCode(error instanceof ApiError ? error.code : undefined); setStatus('error'); }
    } finally {
      if (controller.current === active) controller.current = null;
    }
  }

  return { draft, setDraft, messages, status, errorCode, online, send, cancel, retry: () => pending.current ? send(pending.current.text) : Promise.resolve() };
}
