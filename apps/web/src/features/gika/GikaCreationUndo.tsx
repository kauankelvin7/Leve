import { useEffect, useRef, useState } from 'react';
import type { CreationUndoContext } from '../../../../../packages/domain/src/gikaUndo';
import { Icon } from '../../components/ui/Icon';
import { ApiError } from '../../platform/api';
import { executeCreationUndo } from './creationUndoBridge';

export function GikaCreationUndo({ context, active, onUndone }: { onUndone?: () => void; context: CreationUndoContext; active: boolean }) {
  const [state, setState] = useState<'ready' | 'pending' | 'done' | 'error' | 'conflict' | 'removed' | 'auth'>('ready');
  const controller = useRef<AbortController | null>(null);
  const action = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const actionHadFocus = useRef(false);
  function finish(next: typeof state) {
    const focused = actionHadFocus.current && (document.activeElement === action.current || document.activeElement === document.body || document.activeElement === action.current?.closest('dialog'));
    setState(next);
    if (focused && ['done', 'conflict', 'removed', 'auth'].includes(next)) requestAnimationFrame(() => {
      if (feedback.current?.closest('dialog')?.open) feedback.current.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    if (!active) { controller.current?.abort(); controller.current = null; setState(current => current === 'pending' ? 'error' : current); }
    return () => { controller.current?.abort(); controller.current = null; };
  }, [active]);
  async function undo() {
    if (!active || controller.current || ['done', 'conflict', 'removed', 'auth'].includes(state)) return;
    actionHadFocus.current = document.activeElement === action.current;
    const pending = new AbortController(); controller.current = pending; setState('pending');
    try {
      await executeCreationUndo(context, AbortSignal.any([pending.signal, AbortSignal.timeout(30_000)]));
      if (!pending.signal.aborted && controller.current === pending) { finish('done'); onUndone?.(); }
    } catch (error) {
      if (!pending.signal.aborted && controller.current === pending) {
        const code = error instanceof ApiError ? error.code : '';
        finish(code === 'REVISION_CONFLICT' ? 'conflict' : code === 'GIKA_UNDO_ALREADY_REMOVED' ? 'removed' : ['AUTH_REQUIRED', 'FORBIDDEN', 'EMAIL_UNVERIFIED'].includes(code) ? 'auth' : 'error');
      }
    } finally { if (controller.current === pending) controller.current = null; }
  }
  const text = state === 'pending' ? 'Desfazendo…' : state === 'done' ? 'Criação desfeita.' : state === 'conflict' ? 'Não foi possível desfazer porque essa tarefa foi alterada.'
    : state === 'removed' ? 'Essa tarefa já foi removida.' : state === 'auth' ? 'Entre na conta que adicionou essa tarefa para desfazer.'
    : state === 'error' ? 'Não consegui confirmar. Confira sua agenda e tente desfazer novamente.' : '';
  return <div className="gika-create-undo">
    <p ref={feedback} tabIndex={-1} className={!text || state === 'pending' ? 'visually-hidden' : undefined} role="status" aria-live="polite">{text}</p>
    {['ready', 'pending', 'error'].includes(state) && <div className="gika-card-actions"><button ref={action} type="button" disabled={state === 'pending'} onClick={() => void undo()}><Icon name="restore" />{state === 'pending' ? 'Desfazendo…' : state === 'error' ? 'Tentar desfazer novamente' : 'Desfazer'}</button></div>}
  </div>;
}
