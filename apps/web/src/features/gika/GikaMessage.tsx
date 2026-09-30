import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { GikaMessage as Message } from './conversation';
import { GikaMark } from './GikaMark';

export function GikaToolResult({ title, children }: { title: string; children: ReactNode }) {
  return <section className="gika-result" aria-label={title}><div className="gika-card-title"><Icon name="list" /><strong>{title}</strong></div>{children}</section>;
}

export function GikaConfirmationCard({ children, onConfirm, onCancel, actionRef }: { children: ReactNode; onConfirm: () => void; onCancel: () => void; actionRef?: RefObject<HTMLButtonElement | null> }) {
  return <section className="gika-confirmation" aria-label="Prévia de demonstração">
    <strong>Prévia de demonstração</strong>{children}
    <div className="gika-card-actions"><button type="button" onClick={onCancel}>Cancelar demonstração</button><button ref={actionRef} type="button" onClick={onConfirm}>Simular organização</button></div>
  </section>;
}

export function GikaUndoNotice({ onUndo, actionRef }: { onUndo: () => void; actionRef: RefObject<HTMLButtonElement | null> }) {
  return <div className="gika-undo" role="status"><p><Icon name="check" />Demonstração concluída. Sua agenda não mudou.</p><button ref={actionRef} type="button" onClick={onUndo}><Icon name="restore" />Desfazer demonstração</button></div>;
}

/** Local presentation only. No tool dispatch, command, agenda read or persistence. */
function GikaDemoPreview() {
  const [state, setState] = useState<'preview' | 'confirmed' | 'cancelled' | 'undone'>('preview');
  const actionRef = useRef<HTMLButtonElement>(null);
  function change(next: typeof state) { setState(next); requestAnimationFrame(() => actionRef.current?.focus()); }
  return <div className="gika-demo-preview">
    <GikaToolResult title="Resultado de exemplo"><p>Estes exemplos não vêm da sua agenda.</p><ul><li>Exemplo: leitura</li><li>Exemplo: caminhada</li></ul></GikaToolResult>
    {state === 'preview' ? <GikaConfirmationCard actionRef={actionRef} onConfirm={() => change('confirmed')} onCancel={() => change('cancelled')}><p>Veja como uma sugestão aparecerá antes de você confirmar.</p><ul><li>Leitura: hoje → amanhã</li><li>Caminhada: continua hoje</li></ul></GikaConfirmationCard>
      : state === 'confirmed' ? <GikaUndoNotice actionRef={actionRef} onUndo={() => change('undone')} />
      : <div className="gika-undo" role="status"><p>{state === 'cancelled' ? 'Demonstração cancelada. Sua agenda não mudou.' : 'Demonstração desfeita. Sua agenda não mudou.'}</p><button ref={actionRef} type="button" onClick={() => change('preview')}>Ver prévia novamente</button></div>}
  </div>;
}

export function GikaMessage({ message }: { message: Message }) {
  return <li className={`gika-message is-${message.role}`}>
    <div className="gika-message-author">{message.role === 'assistant' && <GikaMark />}<span>{message.role === 'user' ? 'Você' : 'Resposta de demonstração'}</span></div>
    <p>{message.text}</p>{message.preview === 'organize-demo' && <GikaDemoPreview />}
  </li>;
}

export function GikaLoading() {
  return <div className="gika-loading"><GikaMark /><span>Preparando uma resposta de demonstração…</span><span className="gika-loading-dots" aria-hidden="true">···</span></div>;
}

export function GikaError({ online, onRetry }: { online: boolean; onRetry: () => void }) {
  return <div className="gika-feedback is-error"><p>Não consegui responder agora. Tente novamente em alguns instantes.</p><button type="button" disabled={!online} onClick={onRetry}>Tentar novamente</button></div>;
}
