import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { sendCommand } from '../../platform/api';
import { useUserCollection, useUserDocument } from '../content/useUserCollection';
import { LoadingState } from '../../components/ui/LoadingState';
import { Icon } from '../../components/ui/Icon';
import { ActivitySession, activeSessionIds, MIN_SESSION_MS, saveUnfinishedSession, sessionTabId } from './sessionLifecycle';
import { submitActivitySession } from './sessionPersistence';
import { useAuth } from '../identity/AuthProvider';

const duration = (seconds: number) => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ''}${Math.floor(seconds % 3600 / 60)}min`;

export function ActivityDetail() {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const { item: activity, loading, error } = useUserDocument<Activity>(`activities/${id}`);
  const { items: categories } = useUserCollection<Category>('categories');
  const { items: allEntries } = useUserCollection<TimeEntry>('timeEntries');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const sessionRef = useRef<ActivitySession | null>(null);
  const entries = allEntries.filter(entry => entry.activityId === id && !entry.deletedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const active = entries.find(entry => !entry.endedAt);
  useEffect(() => { document.title = `${activity?.title ?? 'Atividade'} · Leve`; }, [activity?.title]);
  useEffect(() => { if (!active && !activity) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [active?.id, activity?.id]);

  function finishPassiveSession(keepalive = false) {
    const session = sessionRef.current?.finish();
    sessionRef.current = null;
    if (!session) return;
    activeSessionIds.delete(session.sessionId);
    saveUnfinishedSession(localStorage, session);
    void submitActivitySession(session, keepalive).catch(() => setMessage('A sessão continua salva neste aparelho. Você pode registrá-la quando a conexão voltar.'));
  }

  useEffect(() => {
    if (!user || !activity || activity.deletedAt || activity.status !== 'pending' || sessionRef.current) return;
    const sessionId = crypto.randomUUID();
    activeSessionIds.add(sessionId);
    sessionRef.current = new ActivitySession(activity.id, activity.title, activity.schedule.timeZone, Date.now(), sessionId, user.uid, sessionTabId());
    if (document.visibilityState === 'hidden') sessionRef.current.pause();
    const checkpoint = window.setInterval(() => {
      if (sessionRef.current && sessionRef.current.elapsedMs() >= MIN_SESSION_MS) saveUnfinishedSession(localStorage, sessionRef.current.snapshot());
    }, 5000);
    const visibility = () => {
      if (document.visibilityState === 'hidden') { sessionRef.current?.pause(); if (sessionRef.current) saveUnfinishedSession(localStorage, sessionRef.current.snapshot()); }
      else sessionRef.current?.resume();
    };
    const pagehide = () => finishPassiveSession(true);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
    return () => {
      window.clearInterval(checkpoint);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide);
      finishPassiveSession();
    };
  }, [activity?.id, activity?.status, activity?.deletedAt, user?.uid]);

  async function status(value: 'pending' | 'completed' | 'canceled') {
    if (!activity) return;
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: value } }); if (value === 'completed') finishPassiveSession(); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); }
  }
  async function stopLegacyTimer() {
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
  const total = entries.reduce((sum, entry) => sum + (entry.endedAt ? entry.durationSeconds : Math.max(0, Math.floor((now - Date.parse(entry.startedAt)) / 1000))), 0);
  const passiveSeconds = Math.floor((sessionRef.current?.elapsedMs(now) ?? 0) / 1000);
  return <main><header className="page-heading"><Link className="back-link" to="/hoje" aria-label="Voltar ao Meu dia"><Icon name="chevronLeft" /> Voltar</Link><p className="eyebrow">{activity.kind === 'task' ? 'Tarefa' : 'Compromisso'}</p><h1 id="page-title" tabIndex={-1}>{activity.title}</h1><p>{category?.name ?? 'Sem categoria'} · {activity.status === 'pending' ? 'Pendente' : activity.status === 'completed' ? 'Concluída' : 'Cancelado'}</p><span className="passive-time" aria-label={`${duration(passiveSeconds)} nesta sessão`}><Icon name="clock" />{duration(passiveSeconds)}</span></header>
    <section className="panel content-form"><h2>Detalhes</h2><p>{activity.descriptionPlain || 'Sem descrição.'}</p><p>{activity.schedule.type === 'task' ? activity.schedule.dueDate ?? 'Sem prazo' : activity.schedule.startDate}</p>{activity.estimatedMinutes ? <p>Estimativa: {activity.estimatedMinutes} minutos.</p> : null}<div className="dialog-actions">{activity.kind === 'task' ? <button className="primary" onClick={() => void status(activity.status === 'completed' ? 'pending' : 'completed')}>{activity.status === 'completed' ? 'Reabrir' : 'Concluir'}</button> : <button onClick={() => void status(activity.status === 'canceled' ? 'pending' : 'canceled')}>{activity.status === 'canceled' ? 'Reativar' : 'Cancelar compromisso'}</button>}<Link className="button" to="/hoje">Abrir no Meu dia</Link></div></section>
    <section className="panel content-form timer-panel"><div className="section-heading"><div><p className="eyebrow">Tempo da atividade</p><h2>{duration(total)}</h2></div>{active ? <button onClick={() => void stopLegacyTimer()}>Encerrar registro anterior</button> : null}</div><p className="muted">Esta página registra uma sessão enquanto fica visível. Você também pode adicionar um período manual.</p><form className="manual-time" onSubmit={addManual}><label>Tempo manual <input name="minutes" type="number" min="1" max="1440" required placeholder="Minutos" /></label><button>Registrar</button></form>{entries.length ? <ul className="time-history">{entries.slice(0, 10).map(entry => <li key={entry.id}><span>{new Date(entry.startedAt).toLocaleDateString('pt-BR')}</span><strong>{duration(entry.endedAt ? entry.durationSeconds : Math.floor((now - Date.parse(entry.startedAt)) / 1000))}</strong><small>{entry.source === 'manual' ? 'Manual' : entry.source === 'session' ? 'Sessão' : entry.endedAt ? 'Sessão' : 'Em andamento'}</small></li>)}</ul> : <p>O tempo registrado aparecerá aqui.</p>}</section><p role="status">{error || message}</p></main>;
}
