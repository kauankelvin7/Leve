import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { sendCommand } from '../../platform/api';
import { useUserCollection, useUserDocument } from '../content/useUserCollection';
import { LoadingState } from '../../components/ui/LoadingState';
import { Icon } from '../../components/ui/Icon';
import { compactDuration, timeEntrySeconds } from './timeTracking';

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
  useEffect(() => { if (!active && !activity) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [active?.id, activity?.id]);
  useEffect(() => { if (activity && window.location.hash === '#cronometro') window.requestAnimationFrame(() => document.getElementById('cronometro')?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }, [activity?.id]);

  async function status(value: 'pending' | 'completed' | 'canceled') {
    if (!activity) return;
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: value } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); }
  }
  async function startTimer() {
    if (!activity) return;
    try { await sendCommand({ command: 'timeEntry.start', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: { activityId: activity.id, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: activity.schedule.timeZone }).format(new Date()), timeZone: activity.schedule.timeZone }, clientCreatedAt: new Date().toISOString() }); setMessage('Cronômetro iniciado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível iniciar o cronômetro.'); }
  }
  async function pauseTimer() {
    if (!active) return;
    try { await sendCommand({ command: 'timeEntry.pause', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() }); setMessage('Cronômetro pausado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível pausar o cronômetro.'); }
  }
  async function resumeTimer() {
    if (!active) return;
    try { await sendCommand({ command: 'timeEntry.resume', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() }); setMessage('Cronômetro retomado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível retomar o cronômetro.'); }
  }
  async function stopTimer() {
    if (!active) return;
    try { await sendCommand({ command: 'timeEntry.stop', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() }); setMessage('Registro anterior encerrado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível encerrar o registro anterior.'); }
  }
  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activity) return;
    const form = event.currentTarget;
    const minutes = Number(new FormData(form).get('minutes'));
    try { await sendCommand({ command: 'timeEntry.addManual', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: { activityId: activity.id, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: activity.schedule.timeZone }).format(new Date()), timeZone: activity.schedule.timeZone, durationSeconds: minutes * 60 }, clientCreatedAt: new Date().toISOString() }); form.reset(); setMessage('Tempo manual registrado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível registrar o tempo.'); }
  }
  if (loading) return <LoadingState variant="detail" label="Abrindo a atividade…" />;
  if (!activity || activity.deletedAt) return <main><h1 id="page-title" tabIndex={-1}>Atividade indisponível</h1><Link to="/hoje">Voltar ao Meu dia</Link></main>;
  const category = categories.find(item => item.id === activity.categoryId);
  const total = entries.reduce((sum, entry) => sum + timeEntrySeconds(entry, now), 0);
  return <main><header className="page-heading"><Link className="back-link" to="/hoje" aria-label="Voltar ao Meu dia"><Icon name="chevronLeft" /> Voltar</Link><p className="eyebrow">{activity.kind === 'task' ? 'Tarefa' : 'Compromisso'}</p><h1 id="page-title" tabIndex={-1}>{activity.title}</h1><p>{category?.name ?? 'Sem categoria'} · {activity.status === 'pending' ? 'Pendente' : activity.status === 'completed' ? 'Concluída' : 'Cancelado'}</p></header>
    <section className="panel content-form"><h2>Detalhes</h2><p>{activity.descriptionPlain || 'Sem descrição.'}</p><p>{activity.schedule.type === 'task' ? activity.schedule.dueDate ?? 'Sem prazo' : activity.schedule.startDate}</p>{activity.estimatedMinutes ? <p>Estimativa: {activity.estimatedMinutes} minutos.</p> : null}<div className="dialog-actions">{activity.kind === 'task' ? <button className="primary" onClick={() => void status(activity.status === 'completed' ? 'pending' : 'completed')}>{activity.status === 'completed' ? 'Reabrir' : 'Concluir'}</button> : <button onClick={() => void status(activity.status === 'canceled' ? 'pending' : 'canceled')}>{activity.status === 'canceled' ? 'Reativar' : 'Cancelar compromisso'}</button>}<Link className="button" to="/hoje">Abrir no Meu dia</Link></div></section>
    <section id="cronometro" className={`panel content-form timer-panel${active ? ' has-running-timer' : ''}`} aria-labelledby="timer-title"><div className="section-heading"><div><p className="eyebrow">Tempo da atividade</p><h2 id="timer-title">{compactDuration(total)}</h2></div><div className="dialog-actions">{!active ? <button className="primary" onClick={() => void startTimer()}><Icon name="play" />Iniciar</button> : active.paused ? <button className="primary" onClick={() => void resumeTimer()}><Icon name="play" />Retomar</button> : <button className="primary" onClick={() => void pauseTimer()}><Icon name="pause" />Pausar</button>}{active ? <button onClick={() => void stopTimer()}><Icon name="stop" />Encerrar</button> : null}</div></div><p className="muted">O cronômetro continua contando fora desta página. Ao pausar, o tempo fica guardado até você retomar.</p><form className="manual-time" onSubmit={addManual}><label>Tempo manual <input name="minutes" type="number" min="1" max="1440" required placeholder="Minutos" /></label><button>Registrar</button></form>{entries.length ? <ul className="time-history">{entries.slice(0, 10).map(entry => <li key={entry.id}><span>{new Date(entry.startedAt).toLocaleDateString('pt-BR')}</span><strong>{compactDuration(timeEntrySeconds(entry, now))}</strong><small>{entry.source === 'manual' ? 'Manual' : entry.source === 'session' ? 'Sessão' : entry.endedAt ? 'Encerrado' : entry.paused ? 'Pausado' : 'Em andamento'}</small></li>)}</ul> : <p>O tempo registrado aparecerá aqui.</p>}</section><p role="status">{error || message}</p></main>;
}
