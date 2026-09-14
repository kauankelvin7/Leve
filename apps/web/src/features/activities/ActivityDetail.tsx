import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Activity, Category } from '../../../../../packages/domain/src/content';
import { sendCommand } from '../../platform/api';
import { useUserCollection, useUserDocument } from '../content/useUserCollection';

export function ActivityDetail() {
  const { id = '' } = useParams();
  const { item: activity, loading, error } = useUserDocument<Activity>(`activities/${id}`);
  const { items: categories } = useUserCollection<Category>('categories');
  const [message, setMessage] = useState('');
  useEffect(() => { document.title = `${activity?.title ?? 'Atividade'} · Leve`; }, [activity?.title]);
  async function status(value: 'pending' | 'completed' | 'canceled') {
    if (!activity) return;
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: value } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); }
  }
  if (loading) return <main role="status">Carregando atividade…</main>;
  if (!activity || activity.deletedAt) return <main><h1 id="page-title" tabIndex={-1}>Atividade indisponível</h1><Link to="/hoje">Voltar ao Meu dia</Link></main>;
  const category = categories.find(item => item.id === activity.categoryId);
  return <main><header className="page-heading"><p className="eyebrow">{activity.kind === 'task' ? 'Tarefa' : 'Compromisso'}</p><h1 id="page-title" tabIndex={-1}>{activity.title}</h1><p>{category?.name ?? 'Sem categoria'} · {activity.status === 'pending' ? 'Pendente' : activity.status === 'completed' ? 'Concluída' : 'Cancelado'}</p></header><section className="panel content-form"><h2>Detalhes</h2><p>{activity.descriptionPlain || 'Sem descrição.'}</p><p>{activity.schedule.type === 'task' ? activity.schedule.dueDate ?? 'Sem prazo' : activity.schedule.startDate}</p>{activity.seriesId ? <p>Esta é uma ocorrência de uma atividade recorrente.</p> : null}<div className="dialog-actions">{activity.kind === 'task' ? <button className="primary" onClick={() => void status(activity.status === 'completed' ? 'pending' : 'completed')}>{activity.status === 'completed' ? 'Reabrir' : 'Concluir'}</button> : <button onClick={() => void status(activity.status === 'canceled' ? 'pending' : 'canceled')}>{activity.status === 'canceled' ? 'Reativar' : 'Cancelar compromisso'}</button>}<Link className="button" to="/hoje">Abrir no Meu dia</Link></div></section><p role="status">{error || message}</p></main>;
}
