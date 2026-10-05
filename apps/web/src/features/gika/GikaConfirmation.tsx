import { useCharacterEvent } from './character/CharacterEvents';
import { useEffect, useRef, useState } from 'react';
import type { GikaConfirmation as Confirmation, ConfirmationState } from '../../../../../packages/domain/src/gikaConfirmation';
import type { RescheduledTask } from '../../../../../packages/domain/src/gikaReschedule';
import type { GikaContextOutcome, GikaRequest } from './conversation';
import { ApiError } from '../../platform/api';
import { Icon } from '../../components/ui/Icon';
import { confirmGikaAction } from './confirmationBridge';

/** Presentation only: execution always consumes the original structured contract, never these labels. */
export function GikaConfirmationCard({ confirmation, state, result, feedbackRef, actionRef, retryAllowed, active, errorText, onConfirm, onCancel }: {
  confirmation: Confirmation; state: ConfirmationState; result: RescheduledTask | null;
  feedbackRef: React.RefObject<HTMLParagraphElement | null>; actionRef: React.RefObject<HTMLButtonElement | null>;
  retryAllowed: boolean; active: boolean; errorText?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const task = confirmation.action.task, summary = confirmation.summary;
  const label = (date: string) => date.split('-').reverse().join('/');
  const moment = (value: typeof summary.before) => `${label(value.dueDate)}${value.dueTime ? ` às ${value.dueTime}` : ''}`;
  const text = state === 'confirmed' ? `Movida para ${label(result!.dueDate!)}.`
    : state === 'confirming' ? 'Movendo a tarefa…'
    : state === 'conflict' ? (errorText ?? 'Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.')
    : state === 'cancelled' ? 'Alteração cancelada.'
    : state === 'failed' ? (errorText ?? 'Não consegui confirmar. Confira sua agenda e tente novamente.') : 'Confira a nova data antes de mover.';
  return <section className="gika-result gika-confirmation" role="group" aria-label={state === 'confirmed' ? 'Tarefa reagendada' : 'Prévia de reagendamento'} aria-busy={state === 'confirming'} data-confirmation-state={state}>
    <div className="gika-card-title"><Icon name={state === 'confirmed' ? 'check' : 'calendar'} /><strong>{result?.title ?? task.title}</strong></div>
    {state === 'confirmed' ? <p>{moment({ dueDate: result!.dueDate!, dueTime: result!.dueTime })}</p> : <><dl className="gika-confirmation-diff"><div><dt>De</dt><dd>{moment(summary.before)}</dd></div><div><dt>Para</dt><dd>{moment(summary.after)}</dd></div></dl></>}
    <p ref={feedbackRef} tabIndex={-1} role="status" aria-live="polite">{text}</p>
    {(state === 'awaiting_confirmation' || state === 'confirming' || (state === 'failed' && retryAllowed)) && <div className="gika-card-actions">
      {state === 'awaiting_confirmation' && <button type="button" disabled={!active} onClick={onCancel}>Cancelar</button>}
      <button ref={actionRef} type="button" disabled={state === 'confirming' || !active} onClick={onConfirm}>{state === 'confirming' ? 'Movendo…' : state === 'failed' ? 'Tentar mover novamente' : 'Mover tarefa'}</button>
    </div>}
  </section>;
}

export function GikaConfirmation({ confirmation, context, active, onOutcome }: { onOutcome?: (outcome: GikaContextOutcome) => void; confirmation: Confirmation; context: { uid: string; request: GikaRequest }; active: boolean }) {
  const notifyCharacter = useCharacterEvent();
  const [errorText, setErrorText] = useState<string | undefined>();
  const [state, setState] = useState<ConfirmationState>('awaiting_confirmation');
  const [result, setResult] = useState<RescheduledTask | null>(null), [retryAllowed, setRetryAllowed] = useState(true);
  const controller = useRef<AbortController | null>(null), action = useRef<HTMLButtonElement>(null), feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!active) { controller.current?.abort(); controller.current = null; setState(current => current === 'confirming' ? 'failed' : current); }
    return () => { controller.current?.abort(); controller.current = null; };
  }, [active]);
  function focusFeedback() { requestAnimationFrame(() => { if (feedback.current?.closest('dialog')?.open) feedback.current.focus({ preventScroll: true }); }); }
  function cancel() { if (!active || controller.current || state !== 'awaiting_confirmation') return; setState('cancelled'); onOutcome?.({ state: 'cancelled', tasks: [] }); notifyCharacter('idle'); focusFeedback(); }
  async function confirm() {
    if (!active || controller.current || !['awaiting_confirmation', 'failed'].includes(state) || !retryAllowed) return;
    const hadFocus = document.activeElement === action.current, pending = new AbortController(); controller.current = pending; setState('confirming'); notifyCharacter('working');
    try {
      const ack = await confirmGikaAction(confirmation, context.request, context.uid, AbortSignal.any([pending.signal, AbortSignal.timeout(30_000)]));
      if (pending.signal.aborted || controller.current !== pending) return;
      setResult(ack); setState('confirmed'); onOutcome?.({ state: 'confirmed', tasks: [{ title: ack.title, dueDate: ack.dueDate, dueTime: ack.dueTime }] }); notifyCharacter('ack');
    } catch (error) {
      if (pending.signal.aborted || controller.current !== pending) return;
      notifyCharacter('error'); onOutcome?.({ state: 'uncertain', tasks: [] });
      const code = error instanceof ApiError ? error.code : '';
      setErrorText(code === 'GIKA_CONFIRMATION_EXPIRED' ? 'Essa prévia expirou. Faça o pedido novamente.' : ['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED'].includes(code) ? 'Entre na conta que fez esse pedido para mover a tarefa.' : code === 'GIKA_RESCHEDULE_CONFLICT' ? 'Essa tarefa mudou antes do reagendamento. Faça o pedido novamente.' : undefined);
      setRetryAllowed(!['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED', 'GIKA_CONFIRMATION_INVALID', 'OPERATION_MISMATCH'].includes(code));
      setState(['GIKA_RESCHEDULE_CONFLICT', 'GIKA_CONFIRMATION_EXPIRED'].includes(code) ? 'conflict' : 'failed');
    } finally {
      if (controller.current === pending) { controller.current = null; if (hadFocus) focusFeedback(); }
    }
  }
  return <GikaConfirmationCard confirmation={confirmation} state={state} result={result} errorText={errorText} feedbackRef={feedback} actionRef={action} retryAllowed={retryAllowed} active={active} onConfirm={() => void confirm()} onCancel={cancel} />;
}
