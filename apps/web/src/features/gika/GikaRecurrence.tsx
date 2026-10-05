import { useCharacterEvent } from './character/CharacterEvents';
import { useEffect, useRef, useState } from 'react';
import type { RecurrenceChoice, RecurrenceConfirmation, RecurrenceApplied } from '../../../../../packages/domain/src/gikaRecurrence';
import type { GikaContextOutcome, GikaRequest } from './conversation';
import { ApiError } from '../../platform/api';
import { Icon } from '../../components/ui/Icon';
import { chooseGikaRecurrence, confirmGikaRecurrence } from './recurrenceBridge';

type State = 'choice' | 'preparing' | 'preview' | 'confirming' | 'confirmed' | 'cancelled' | 'conflict' | 'failed';
const label = (date: string) => date.split('-').reverse().join('/');
const moment = (date: string, time: string | null) => `${label(date)}${time ? ` às ${time}` : ''}`;
export function GikaRecurrence({ choice, confirmation: initial, context, active, onOutcome }: { onOutcome?: (outcome: GikaContextOutcome) => void; choice?: RecurrenceChoice; confirmation?: RecurrenceConfirmation; context: { uid: string; request: GikaRequest }; active: boolean }) {
  const notifyCharacter = useCharacterEvent();
  const [confirmation, setConfirmation] = useState(initial), [state, setState] = useState<State>(initial ? 'preview' : 'choice');
  const [result, setResult] = useState<RecurrenceApplied | null>(null), [errorText, setErrorText] = useState<string>();
  const [retryAllowed, setRetryAllowed] = useState(true);
  const selected = useRef<'occurrence' | 'future' | null>(null), controller = useRef<AbortController | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!active) { controller.current?.abort(); controller.current = null; setState(current => ['preparing', 'confirming'].includes(current) ? 'failed' : current); }
    return () => { controller.current?.abort(); controller.current = null; };
  }, [active]);
  function focusFeedback() { requestAnimationFrame(() => { if (feedback.current?.closest('dialog')?.open) feedback.current.focus({ preventScroll: true }); }); }
  function fail(error: unknown) {
    notifyCharacter('error'); onOutcome?.({ state: 'uncertain', tasks: [] });
    const code = error instanceof ApiError ? error.code : '';
    const conflict = ['REVISION_CONFLICT', 'GIKA_RECURRENCE_CONFLICT', 'GIKA_CONFIRMATION_EXPIRED'].includes(code);
    setErrorText(code === 'GIKA_CONFIRMATION_EXPIRED' ? 'Essa prévia expirou. Faça o pedido novamente.' : conflict ? 'Essa rotina mudou. Faça o pedido novamente.' : ['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED'].includes(code) ? 'Entre na conta que fez esse pedido para continuar.' : 'Não consegui confirmar. Confira sua agenda e tente novamente.');
    setRetryAllowed(!conflict && !['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED', 'GIKA_CONFIRMATION_INVALID', 'OPERATION_MISMATCH'].includes(code));
    setState(conflict ? 'conflict' : 'failed');
  }
  async function run(scope?: 'occurrence' | 'future') {
    if (!active || controller.current || !retryAllowed || !['choice', 'preview', 'failed'].includes(state)) return;
    if (!confirmation && (!choice || (!scope && !selected.current))) return;
    if (selected.current && scope && scope !== selected.current) return;
    const pending = new AbortController(); controller.current = pending;
    const signal = AbortSignal.any([pending.signal, AbortSignal.timeout(30_000)]);
    try {
      if (!confirmation) {
        selected.current ??= scope!; setState('preparing'); notifyCharacter('working');
        const prepared = await chooseGikaRecurrence(choice!, selected.current!, context.request, context.uid, signal);
        if (pending.signal.aborted || controller.current !== pending) return;
        setConfirmation(prepared); setState('preview'); notifyCharacter('clarify');
      } else {
        setState('confirming'); notifyCharacter('working');
        const ack = await confirmGikaRecurrence(confirmation, context.request, context.uid, signal);
        if (pending.signal.aborted || controller.current !== pending) return;
        setResult(ack); setState('confirmed'); onOutcome?.({ state: 'confirmed', tasks: [{ title: ack.title, dueDate: ack.dueDate, dueTime: ack.dueTime, ...(ack.operation === 'complete' ? { status: 'completed' as const } : {}) }] }); notifyCharacter('ack');
      }
    } catch (error) { if (!pending.signal.aborted && controller.current === pending) fail(error); }
    finally { if (controller.current === pending) { controller.current = null; focusFeedback(); } }
  }
  function cancel() { if (!active || controller.current || !['choice', 'preview'].includes(state)) return; setState('cancelled'); onOutcome?.({ state: 'cancelled', tasks: [] }); notifyCharacter('idle'); focusFeedback(); }
  const proposal = confirmation?.effect ?? choice?.proposal;
  if (!proposal) return null;
  const future = confirmation?.effect.scope === 'future', count = future ? proposal.recurrence.futureCount : 1;
  const verb = proposal.operation === 'complete' ? 'Concluir' : proposal.operation === 'update' ? 'Renomear' : 'Mover';
  const action = future ? `${verb} esta e as próximas` : `${verb} tarefa`;
  const busy = state === 'preparing' || state === 'confirming';
  const text = state === 'confirmed' ? proposal.operation === 'complete' ? 'Tarefa concluída.' : proposal.operation === 'update' ? `${result!.affectedCount === 1 ? 'Tarefa renomeada' : `${result!.affectedCount} tarefas renomeadas`}.` : `${result!.affectedCount === 1 ? 'Tarefa movida' : `${result!.affectedCount} tarefas movidas`}.`
    : state === 'cancelled' ? 'Alteração cancelada.' : state === 'preparing' ? 'Preparando a prévia…' : state === 'confirming' ? 'Aplicando a alteração…' : state === 'failed' || state === 'conflict' ? errorText ?? 'Não consegui confirmar. Confira sua agenda e tente novamente.' : state === 'choice' ? choice!.options.includes('future') ? 'Quer alterar só esta tarefa ou também as próximas?' : 'Quer alterar só esta tarefa da rotina?' : 'Confira a alteração antes de confirmar.';
  return <section className="gika-result gika-confirmation" role="group" aria-label={state === 'confirmed' ? 'Rotina atualizada' : confirmation ? 'Prévia da rotina' : 'Escolher tarefas da rotina'} aria-busy={busy} data-recurrence-state={state}>
    <div className="gika-card-title"><Icon name={state === 'confirmed' ? 'check' : 'calendar'} /><strong>{result?.title ?? proposal.task.title}</strong></div>
    <p>{moment(result?.dueDate ?? proposal.task.dueDate, result ? result.dueTime : proposal.task.dueTime)} · Rotina</p>
    {confirmation && state !== 'confirmed' && <>
      <p>{future ? `Esta e as próximas: ${count} tarefas disponíveis agora. A rotina também muda para as próximas datas.` : 'Só esta tarefa.'}</p>
      {proposal.operation === 'update' && <dl className="gika-confirmation-diff"><div><dt>De</dt><dd>{proposal.task.title}</dd></div><div><dt>Para</dt><dd>{proposal.patch.title}</dd></div></dl>}
      {proposal.operation === 'reschedule' && <dl className="gika-confirmation-diff"><div><dt>De</dt><dd>{moment(proposal.task.dueDate, proposal.task.dueTime)}</dd></div><div><dt>Para</dt><dd>{moment(proposal.patch.dueDate, proposal.patch.dueTime ?? proposal.task.dueTime)}</dd></div></dl>}
      {proposal.operation === 'complete' && <p>Vou marcar esta tarefa como concluída.</p>}

    </>}
    <p ref={feedback} tabIndex={-1} role="status" aria-live="polite">{text}</p>
    {(state === 'choice' || state === 'preview' || busy || (state === 'failed' && retryAllowed)) && <div className="gika-card-actions">
      {(state === 'choice' || state === 'preview') && <button type="button" disabled={!active} onClick={cancel}>Cancelar</button>}
      {state === 'choice' ? choice!.options.map(scope => <button key={scope} type="button" disabled={!active} onClick={() => void run(scope)}>{scope === 'occurrence' ? 'Só esta' : 'Esta e as próximas'}</button>) : <button type="button" disabled={!active || busy} onClick={() => void run()}>{state === 'preparing' ? 'Preparando…' : state === 'confirming' ? 'Aplicando…' : state === 'failed' ? 'Tentar novamente' : action}</button>}
    </div>}
  </section>;
}
