import { GikaBatch } from './GikaBatch';
import { GikaConfirmation } from './GikaConfirmation';
import { GikaRecurrence } from './GikaRecurrence';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { GikaMessage as Message } from './conversation';
import { GikaCreationUndo } from './GikaCreationUndo';
import { GikaMark } from './GikaMark';
import type { ReadItem } from '../../../../../packages/domain/src/gika';

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

export function GikaMessage({ message, active = true, superseded = false }: { message: Message; active?: boolean; superseded?: boolean }) {
  return <li className={`gika-message is-${message.role}`}>
    <div className="gika-message-author">{message.role === 'assistant' && <GikaMark />}<span>{message.role === 'user' ? 'Você' : message.simulated ? 'Resposta de demonstração' : 'Gika'}</span></div>
    <p>{message.text}</p>
    {message.organizationPreview && <GikaToolResult title="Sugestão de organização"><ul>{message.organizationPreview.items.map(item => <li key={item.id}><strong>{item.title}</strong><span> · {civilLabel(item.before.dueDate)}{item.before.dueTime ? ` às ${item.before.dueTime}` : ' sem horário'}{item.action === 'keep' ? ' · Permanece' : ` → ${civilLabel(item.after.dueDate)}`}</span></li>)}</ul><p>Nenhuma tarefa foi alterada.</p></GikaToolResult>}
    {message.createdTask && <section className="gika-result" role="group" aria-label="Tarefa adicionada"><div className="gika-card-title"><Icon name="check" /><strong>{message.createdTask.title}</strong></div><p>{message.createdTask.dueDate ? civilLabel(message.createdTask.dueDate) : 'Sem data'}{message.createdTask.dueTime ? ` às ${message.createdTask.dueTime}` : ''}</p>{message.creationUndo && <GikaCreationUndo context={message.creationUndo} active={active} />}</section>}
    {message.batchConfirmation && message.rescheduleContext && <GikaBatch confirmation={message.batchConfirmation} context={message.rescheduleContext} active={active} superseded={superseded} />}
    {message.confirmation && message.rescheduleContext && <GikaConfirmation confirmation={message.confirmation} context={message.rescheduleContext} active={active} />}
    {(message.recurrenceChoice || message.recurrenceConfirmation) && message.rescheduleContext && <GikaRecurrence choice={message.recurrenceChoice} confirmation={message.recurrenceConfirmation} context={message.rescheduleContext} active={active} />}
    {message.updatedTask && <section className="gika-result" role="group" aria-label="Tarefa atualizada"><div className="gika-card-title"><Icon name="check" /><strong>{message.updatedTask.title}</strong></div><p>{civilLabel(message.updatedTask.dueDate)}</p></section>}
    {message.completedTask && <section className="gika-result" role="group" aria-label="Tarefa concluída"><div className="gika-card-title"><Icon name="check" /><strong>{message.completedTask.title}</strong></div><p>{civilLabel(message.completedTask.dueDate)}</p></section>}
    {(message.rescheduleResolution ?? message.updateResolution ?? message.completionResolution)?.candidates.length ? <section className="gika-result" role="group" aria-label="Tarefas encontradas"><ul>{(message.rescheduleResolution ?? message.updateResolution ?? message.completionResolution)!.candidates.map(item => <li key={item.id}><strong>{item.title}</strong><span> · {item.dueDate ? civilLabel(item.dueDate) : 'Sem data'} · {item.status === 'completed' ? 'Concluída' : item.status === 'canceled' ? 'Cancelada' : 'Pendente'}</span></li>)}</ul></section> : null}
    {message.simulated && message.preview === 'organize-demo' && <GikaDemoPreview />}
    {message.reads?.map((read, index) => <GikaToolResult key={index} title={read.startDate === read.endDate ? `Agenda de ${civilLabel(read.startDate)}` : `Agenda de ${civilLabel(read.startDate)} a ${civilLabel(read.endDate)}`}>
      <p>Horários em {read.timeZone}.</p>
      {read.partial && <p>Consulta parcial. Pode haver outros itens ou rotinas ainda não disponíveis neste período.</p>}
      {read.items.length ? <ul>{read.items.map(item => <li key={item.id}><strong>{item.title}</strong><span> · {itemLabel(item)}</span></li>)}</ul> : <p>{read.partial ? 'Não há itens nesta parte da consulta.' : 'Nada planejado para esse período.'}</p>}
    </GikaToolResult>)}
  </li>;
}

function civilLabel(date: string) { return date.split('-').reverse().join('/'); }
function itemLabel(item: ReadItem) {
  const schedule = item.schedule;
  const status = { pending: 'Pendente', completed: 'Concluída', canceled: 'Cancelada' }[item.status];
  const when = schedule.type === 'task' ? `${schedule.dueDate ? civilLabel(schedule.dueDate) : 'Sem data'}${schedule.dueTime ? ` às ${schedule.dueTime}` : ''}`
    : schedule.allDay ? `Dia inteiro, a partir de ${civilLabel(schedule.startDate)}` : `${civilLabel(schedule.startDate)} às ${schedule.startTime} até ${civilLabel(schedule.endDate)} às ${schedule.endTime}`;
  return `${status} · ${when}${item.seriesId ? ' · Rotina' : ''}`;
}

export function GikaLoading({ demo = true }: { demo?: boolean }) {
  return <div className="gika-loading"><GikaMark /><span>{demo ? 'Preparando uma resposta de demonstração…' : 'Consultando sua agenda…'}</span><span className="gika-loading-dots" aria-hidden="true">···</span></div>;
}

export function GikaError({ online, onRetry, code }: { online: boolean; onRetry: () => void; code?: string }) {
  if (code === 'GIKA_UPDATE_CONFLICT') return <div className="gika-feedback is-error"><p>Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.</p></div>;
  if (code === 'REVISION_CONFLICT') return <div className="gika-feedback is-error"><p>Essa tarefa foi alterada. Confira sua agenda e envie um novo pedido.</p></div>;
  return <div className="gika-feedback is-error"><p>{code === 'GIKA_QUOTA' ? 'O limite de consultas foi atingido por agora. Sua agenda continua disponível.' : 'Não consegui responder agora. Tente novamente em alguns instantes.'}</p><button type="button" disabled={!online} onClick={onRetry}>Tentar novamente</button></div>;
}
