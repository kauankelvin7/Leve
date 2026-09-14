import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { sendCommand } from '../../platform/api';
import { useUserCollection, useUserDocument } from '../content/useUserCollection';
import { LoadingState } from '../../components/ui/LoadingState';

const duration = (seconds: number) => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ''}${Math.floor(seconds % 3600 / 60)}min`;

export function ActivityDetail() {
  const { id = '' } = useParams();
  const { item: activity, loading, error } = useUserDocument<Activity>(`activities/${id}`);
  const { items: categories } = useUserCollection<Category>('categories');
  const { items: allEntries } = useUserCollection<TimeEntry>('timeEntries');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const entries = allEntries.filter(entry => entry.activityId === id && !entry.deletedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const active = entries.find(entry => !entry.endedAt);
  useEffect(() => { document.title = `${activity?.title ?? 'Atividade'} · Leve`; }, [activity?.title]);
  useEffect(() => { if (!active) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [active?.id]);

  async function status(value: 'pending' | 'completed' | 'canceled') {
    if (!activity) return;
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: value } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); }
  }
  async function updateTimer(action: 'start' | 'stop') {
    if (!activity) return;
    const entryId = action === 'start' ? crypto.randomUUID() : active!.id;
    const payload = action === 'start' ? { activityId: activity.id, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: activity.schedule.timeZone }).format(new Date()), timeZone: activity.schedule.timeZone } : {};
    try { await sendCommand({ command: `timeEntry.${action}`, operationId: crypto.randomUUID(), entityId: entryId, expectedRevision: action === 'start' ? 0 : active!.revision, payload, clientCreatedAt: new Date().toISOString() }); setMessage(action === 'start' ? 'Cronômetro iniciado.' : 'Tempo registrado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar o cronômetro.'); }
  }
  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activity) return;
    const minutes = Number(new FormData(event.currentTarget).get('minutes'));
    try { await sendCommand({ command: 'timeEntry.addManual', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: { activityId: activity.id, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: activity.schedule.timeZone }).format(new Date()), timeZone: activity.schedule.timeZone, durationSeconds: minutes * 60 }, clientCreatedAt: new Date().toISOString() }); event.currentTarget.reset(); setMessage('Tempo manual registrado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível registrar o tempo.'); }
  }
  if (loading) return <LoadingState variant="detail" label="Abrindo a atividade…" />;
  if (!activity || activity.deletedAt) return <main><h1 id="page-title" tabIndex={-1}>Atividade indisponível</h1><Link to="/hoje">Voltar ao Meu dia</Link></main>;
  const category = categories.find(item => item.id === activity.categoryId);
  const total = entries.reduce((sum, entry) => sum + (entry.endedAt ? entry.durationSeconds : Math.max(0, Math.floor((now - Date.parse(entry.startedAt)) / 1000))), 0);
  return <main><header className="page-heading"><p className="eyebrow">{activity.kind === 'task' ? 'Tarefa' : 'Compromisso'}</p><h1 id="page-title" tabIndex={-1}>{activity.title}</h1><p>{category?.name ?? 'Sem categoria'} · {activity.status === 'pending' ? 'Pendente' : activity.status === 'completed' ? 'Concluída' : 'Cancelado'}</p></header>
    <section className="panel content-form"><h2>Detalhes</h2><p>{activity.descriptionPlain || 'Sem descrição.'}</p><p>{activity.schedule.type === 'task' ? activity.schedule.dueDate ?? 'Sem prazo' : activity.schedule.startDate}</p>{activity.estimatedMinutes ? <p>Estimativa: {activity.estimatedMinutes} minutos.</p> : null}<div className="dialog-actions">{activity.kind === 'task' ? <button className="primary" onClick={() => void status(activity.status === 'completed' ? 'pending' : 'completed')}>{activity.status === 'completed' ? 'Reabrir' : 'Concluir'}</button> : <button onClick={() => void status(activity.status === 'canceled' ? 'pending' : 'canceled')}>{activity.status === 'canceled' ? 'Reativar' : 'Cancelar compromisso'}</button>}<Link className="button" to="/hoje">Abrir no Meu dia</Link></div></section>
    <section className="panel content-form timer-panel"><div className="section-heading"><div><p className="eyebrow">Controle de tempo</p><h2>{active ? duration(Math.floor((now - Date.parse(active.startedAt)) / 1000)) : duration(total)}</h2></div>{active ? <button className="primary" onClick={() => void updateTimer('stop')}>Parar</button> : <button className="primary" onClick={() => void updateTimer('start')}>Iniciar</button>}</div><p className="muted">Total registrado: {duration(total)}.</p><form className="manual-time" onSubmit={addManual}><label>Adicionar tempo manual <input name="minutes" type="number" min="1" max="1440" required placeholder="Minutos" /></label><button>Registrar</button></form>{entries.length ? <ul className="time-history">{entries.slice(0, 10).map(entry => <li key={entry.id}><span>{new Date(entry.startedAt).toLocaleDateString('pt-BR')}</span><strong>{duration(entry.endedAt ? entry.durationSeconds : Math.floor((now - Date.parse(entry.startedAt)) / 1000))}</strong><small>{entry.source === 'manual' ? 'Manual' : entry.endedAt ? 'Cronômetro' : 'Em andamento'}</small></li>)}</ul> : <p>Nenhum tempo registrado.</p>}</section><p role="status">{error || message}</p></main>;
}
