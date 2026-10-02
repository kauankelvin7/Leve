import { useEffect, useRef, useState } from 'react';
import type { BatchConfirmation, BatchResult } from '../../../../../packages/domain/src/gikaBatch';
import type { GikaRequest } from './conversation';
import { ApiError } from '../../platform/api';
import { Icon } from '../../components/ui/Icon';
import { BatchInterruptedError, confirmGikaBatch } from './batchBridge';

type State = 'awaiting_confirmation' | 'confirming' | 'confirmed' | 'cancelled' | 'conflict' | 'partial' | 'failed';
const dateLabel = (date: string) => date.split('-').reverse().join('/');
const moment = (date: string, time: string | null) => `${dateLabel(date)}${time ? ` às ${time}` : ''}`;
const itemStatus = { applied: 'Aplicada', alreadyApplied: 'Já aplicada', conflict: 'A tarefa mudou', failed: 'Não aplicada', pending: 'Não iniciada', unknown: 'Confirmação pendente' };

/** Presentation of the sealed list. Labels never select targets or determine executable effects. */
export function GikaBatch({ confirmation, context, active, superseded = false }: { confirmation: BatchConfirmation; context: { uid: string; request: GikaRequest }; active: boolean; superseded?: boolean }) {
  const [state, setState] = useState<State>('awaiting_confirmation');
  const [result, setResult] = useState<BatchResult | null>(null), [errorText, setErrorText] = useState<string>();
  const [retryAllowed, setRetryAllowed] = useState(true);
  const controller = useRef<AbortController | null>(null), feedback = useRef<HTMLParagraphElement>(null);
  const applied = result ? result.applied + result.alreadyApplied : 0;
  const organization = confirmation.plan.organization;
  const count = confirmation.plan.items.length, completing = confirmation.plan.action === 'complete';
  const noun = count === 1 ? 'tarefa' : 'tarefas';
  const verb = completing ? 'Concluir' : 'Mover', done = completing ? count === 1 ? 'concluída' : 'concluídas' : count === 1 ? 'movida' : 'movidas';
  useEffect(() => {
    if (!active) { controller.current?.abort(); controller.current = null; setState(current => current === 'confirming' ? 'failed' : current); }
    return () => { controller.current?.abort(); controller.current = null; };
  }, [active]);
  useEffect(() => { if(superseded) { setState(current => current === 'awaiting_confirmation' ? 'cancelled' : current); setRetryAllowed(false); } }, [superseded]);
  function focusFeedback() { requestAnimationFrame(() => { if (feedback.current?.closest('dialog')?.open) feedback.current.focus({ preventScroll: true }); }); }
  function cancel() { if (!active || superseded || controller.current || state !== 'awaiting_confirmation') return; setState('cancelled'); focusFeedback(); }
  async function confirm() {
    if (!active || superseded || controller.current || !retryAllowed || !['awaiting_confirmation', 'partial', 'failed'].includes(state)) return;
    const pending = new AbortController(); controller.current = pending; setState('confirming'); setErrorText(undefined);
    try {
      const ack = await confirmGikaBatch(confirmation, context.request, context.uid, AbortSignal.any([pending.signal, AbortSignal.timeout(30_000)]));
      if (pending.signal.aborted || controller.current !== pending) return;
      setResult(ack);
      const committed = ack.applied + ack.alreadyApplied;
      setRetryAllowed(ack.conflicts === 0);
      setState(committed === ack.requested ? 'confirmed' : committed > 0 ? 'partial' : ack.conflicts ? 'conflict' : 'failed');
    } catch (error) {
      if (pending.signal.aborted || controller.current !== pending) return;
      const code = error instanceof ApiError ? error.code : '';
      const terminal = ['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED', 'GIKA_CONFIRMATION_INVALID', 'GIKA_CONFIRMATION_EXPIRED', 'OPERATION_MISMATCH'].includes(code);
      setRetryAllowed(!terminal);
      if (error instanceof BatchInterruptedError) setResult(error.result);
      setErrorText(code === 'GIKA_CONFIRMATION_EXPIRED' ? 'Essa prévia expirou. Confira sua agenda antes de fazer um novo pedido.' : ['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED'].includes(code) ? 'Entre na conta que fez esse pedido para continuar.' : terminal ? 'Não consegui validar essa prévia. Confira sua agenda e faça um novo pedido.' : 'Não consegui confirmar todas as tarefas. Confira sua agenda ou retome este pedido.');
      setState(error instanceof BatchInterruptedError ? 'partial' : code === 'GIKA_CONFIRMATION_EXPIRED' ? 'conflict' : 'failed');
    } finally { if (controller.current === pending) { controller.current = null; focusFeedback(); } }
  }
  const text = state === 'confirmed' ? `${count} ${noun} ${done}.`
    : state === 'cancelled' ? 'Alteração cancelada. Nenhuma tarefa foi alterada.'
    : state === 'confirming' ? completing ? 'Concluindo as tarefas…' : 'Movendo as tarefas…'
    : state === 'conflict' ? errorText ?? 'Uma tarefa mudou depois da prévia. Nenhuma alteração foi aplicada. Faça o pedido novamente.'
    : state === 'partial' ? `${applied} de ${count} tarefas foram ${done}. ${errorText ?? (result!.conflicts ? 'Uma tarefa mudou. Confira os resultados antes de fazer um novo pedido.' : 'As outras ainda não foram confirmadas. Retome este pedido para conferir.')}`
    : state === 'failed' ? errorText ?? (applied > 0 ? `${applied} de ${count} tarefas já foram confirmadas. Retome este pedido para conferir as outras.` : !result || result.unknown ? 'Não recebi a confirmação. A alteração pode ter sido aplicada. Retome este pedido para conferir.' : 'Não consegui aplicar a alteração. Confira as tarefas ou tente novamente.')
    : 'Confira todas as tarefas antes de confirmar.';
  return <section className="gika-result gika-confirmation" role="group" aria-label={state === 'confirmed' ? 'Lote concluído' : 'Prévia do lote'} aria-busy={state === 'confirming'} data-batch-state={state}>
    <div className="gika-card-title"><Icon name={state === 'confirmed' ? 'check' : completing ? 'list' : 'calendar'} /><strong>{organization ? `Reorganizar ${count} ${noun}` : `${verb} ${count} ${noun}`}</strong></div>
    <ul className="gika-batch-items">{confirmation.plan.items.map((item, index) => <li key={item.id}>
      <strong>{item.title}</strong>
      <span>{moment(item.before.dueDate, item.before.dueTime)}{completing ? ' → Concluída' : 'dueDate' in item.patch ? ` → ${moment(item.patch.dueDate, item.patch.dueTime ?? item.before.dueTime)}` : ''}</span>
      {item.scope === 'occurrence' && <span>Rotina: só esta ocorrência.</span>}
      {result && <span>{itemStatus[result.items[index]!.status]}</span>}
    </li>)}</ul>
    {organization?.items.some(item => item.action === 'keep') && <><p>Estas tarefas permanecem:</p><ul className="gika-batch-items">{organization.items.filter(item=>item.action==='keep').map(item=><li key={item.id}><strong>{item.title}</strong><span>{moment(item.before.dueDate,item.before.dueTime)}</span></li>)}</ul></>}
    {confirmation.plan.action === 'reschedule' && <p>{organization ? 'Só as mudanças desta prévia serão aplicadas.' : 'Horários preservados, salvo os que você pediu para mudar.'}</p>}
    <p ref={feedback} tabIndex={-1} role="status" aria-live="polite">{text}</p>
    {(state === 'awaiting_confirmation' || state === 'confirming' || (['partial', 'failed'].includes(state) && retryAllowed)) && <div className="gika-card-actions">
      {state === 'awaiting_confirmation' && <button type="button" disabled={!active} onClick={cancel}>Cancelar</button>}
      <button type="button" disabled={!active || state === 'confirming'} onClick={() => void confirm()}>{state === 'confirming' ? 'Aplicando…' : state === 'awaiting_confirmation' ? `${organization ? 'Reorganizar' : verb} ${count} ${noun}` : 'Retomar tarefas'}</button>
    </div>}
  </section>;
}
