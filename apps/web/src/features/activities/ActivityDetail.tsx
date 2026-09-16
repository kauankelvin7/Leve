import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { ApiError, sendCommand } from '../../platform/api';
import { useActiveTimeEntry, useActivityTimeEntries, useUserCollection, useUserDocument } from '../content/useUserCollection';
import { LoadingState } from '../../components/ui/LoadingState';
import { Icon } from '../../components/ui/Icon';

const duration = (seconds: number) => `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}h ` : ''}${Math.floor(seconds % 3600 / 60)}min`;
const stopwatch = (seconds: number) => [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');

type OpenEntry = Pick<TimeEntry, 'id' | 'revision' | 'startedAt' | 'paused' | 'accumulatedSeconds'>;

export function ActivityDetail() {
  const { id = '' } = useParams();
  const { item: activity, loading, error } = useUserDocument<Activity>(`activities/${id}`);
  const { items: categories } = useUserCollection<Category>('categories');
  const { items: entries } = useActivityTimeEntries(id);
  const { item: globallyActive } = useActiveTimeEntry();
  const [message, setMessage] = useState('');
  const [timerBusy, setTimerBusy] = useState(false);
  const [optimisticTimer, setOptimisticTimer] = useState<OpenEntry | null>(null);
  const [pendingPatch, setPendingPatch] = useState<{ id: string; revision: number; patch: Partial<OpenEntry> } | null>(null);
  const [now, setNow] = useState(Date.now());
  const visibleEntries = entries.filter(entry => !entry.deletedAt);
  const otherActive = globallyActive?.activityId !== id ? globallyActive : undefined;
  const storedActive = visibleEntries.find(entry => !entry.endedAt);
  const rawActive: OpenEntry | undefined = storedActive ?? optimisticTimer ?? undefined;
  const active = rawActive && pendingPatch?.id === rawActive.id && rawActive.revision < pendingPatch.revision
    ? { ...rawActive, ...pendingPatch.patch }
    : rawActive;
  useEffect(() => { document.title = `${activity?.title ?? 'Atividade'} · Leve`; }, [activity?.title]);
  useEffect(() => { if (!active || active.paused) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [active?.id, active?.paused]);
  useEffect(() => { if (storedActive?.id === optimisticTimer?.id) setOptimisticTimer(null); }, [storedActive?.id, optimisticTimer?.id]);
  useEffect(() => {
    if (pendingPatch && storedActive?.id === pendingPatch.id && storedActive.revision >= pendingPatch.revision) setPendingPatch(null);
  }, [storedActive?.id, storedActive?.revision, pendingPatch]);

  function accrued(entry: OpenEntry): number {
    return (entry.accumulatedSeconds ?? 0) + (entry.paused ? 0 : Math.max(0, Math.floor((now - Date.parse(entry.startedAt)) / 1000)));
  }

  async function status(value: 'pending' | 'completed' | 'canceled') {
    if (!activity) return;
    try {
      if (active && value !== 'pending' && !(await stopTimer('Cronômetro finalizado e tempo salvo.'))) return;
      await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: value } });
    }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); }
  }
  async function startTimer() {
    if (!activity || timerBusy || active) return;
    setTimerBusy(true);
    try {
      const entityId = crypto.randomUUID();
      const result = await sendCommand({ command: 'timeEntry.start', operationId: crypto.randomUUID(), entityId, expectedRevision: 0, payload: { activityId: activity.id, civilDate: new Intl.DateTimeFormat('en-CA', { timeZone: activity.schedule.timeZone }).format(new Date()), timeZone: activity.schedule.timeZone }, clientCreatedAt: new Date().toISOString() });
      setOptimisticTimer({ id: entityId, revision: result.revision, startedAt: result.serverTime, paused: false, accumulatedSeconds: 0 });
      setNow(Date.now());
      setMessage('Cronômetro iniciado. Ele continuará contando mesmo se você sair desta página.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível iniciar o cronômetro.'); }
    finally { setTimerBusy(false); }
  }
  async function pauseTimer() {
    if (!active || active.paused || timerBusy) return;
    setTimerBusy(true);
    try {
      const result = await sendCommand({ command: 'timeEntry.pause', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setPendingPatch({ id: active.id, revision: result.revision, patch: { revision: result.revision, paused: true, accumulatedSeconds: accrued(active) } });
      setMessage('Cronômetro pausado. O tempo desta etapa foi salvo — isso fica registrado mesmo se você sair da página.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível pausar o cronômetro.'); }
    finally { setTimerBusy(false); }
  }
  async function resumeTimer() {
    if (!active || !active.paused || timerBusy) return;
    setTimerBusy(true);
    try {
      const result = await sendCommand({ command: 'timeEntry.resume', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setPendingPatch({ id: active.id, revision: result.revision, patch: { revision: result.revision, paused: false, startedAt: result.serverTime } });
      setNow(Date.now());
      setMessage('Cronômetro retomado.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível retomar o cronômetro.'); }
    finally { setTimerBusy(false); }
  }
  async function stopTimer(successMessage: string): Promise<boolean> {
    if (!active) return true;
    setTimerBusy(true);
    try {
      await sendCommand({ command: 'timeEntry.stop', operationId: crypto.randomUUID(), entityId: active.id, expectedRevision: active.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setOptimisticTimer(null);
      setPendingPatch(null);
      setMessage(successMessage);
      return true;
    }
    catch (failure) {
      setOptimisticTimer(null); setPendingPatch(null);
      setMessage(failure instanceof ApiError && failure.status === 409 ? 'O cronômetro mudou em outra janela. Aguarde a atualização e tente novamente.' : failure instanceof Error ? failure.message : 'Não foi possível parar o cronômetro.');
      return false;
    }
    finally { setTimerBusy(false); }
  }
  async function stopOtherTimer() {
    if (!otherActive || timerBusy) return;
    setTimerBusy(true);
    try {
      await sendCommand({ command: 'timeEntry.stop', operationId: crypto.randomUUID(), entityId: otherActive.id, expectedRevision: otherActive.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setMessage('O outro cronômetro foi parado. Agora você pode iniciar este.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível parar o outro cronômetro.'); }
    finally { setTimerBusy(false); }
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
  const total = visibleEntries.reduce((sum, entry) => sum + (entry.endedAt ? entry.durationSeconds : accrued(entry as OpenEntry)), 0);
  const runningSeconds = active ? accrued(active) : 0;
  return <main><header className="page-heading activity-detail-heading"><Link className="back-link" to="/hoje" aria-label="Voltar ao Meu dia"><Icon name="chevronLeft" /> Meu dia</Link><div><p className="eyebrow">{activity.kind === 'task' ? 'Tarefa' : 'Compromisso'}</p><h1 id="page-title" tabIndex={-1}>{activity.title}</h1><p>{category?.name ?? 'Sem categoria'} · {activity.status === 'pending' ? 'Pendente' : activity.status === 'completed' ? 'Concluída' : 'Cancelado'}</p></div></header>
    <section className="panel content-form"><h2>Detalhes</h2><p>{activity.descriptionPlain || 'Sem descrição.'}</p><p>{activity.schedule.type === 'task' ? activity.schedule.dueDate ?? 'Sem prazo' : activity.schedule.startDate}</p>{activity.estimatedMinutes ? <p>Estimativa: {activity.estimatedMinutes} minutos.</p> : null}<div className="dialog-actions">{activity.kind === 'task' ? <button className="primary" onClick={() => void status(activity.status === 'completed' ? 'pending' : 'completed')}>{activity.status === 'completed' ? 'Reabrir' : 'Concluir'}</button> : <button onClick={() => void status(activity.status === 'canceled' ? 'pending' : 'canceled')}>{activity.status === 'canceled' ? 'Reativar' : 'Cancelar compromisso'}</button>}<Link className="button" to="/hoje">Abrir no Meu dia</Link></div></section>
    <section className={`panel content-form timer-panel ${active ? 'has-running-timer' : ''}`}>
      <div className="timer-heading"><div className="timer-heading-copy"><p className="eyebrow">Tempo da atividade</p><h2 className="timer-display" aria-label={`${stopwatch(runningSeconds)} no cronômetro`}>{stopwatch(runningSeconds)}</h2><p className="timer-total">Total registrado <strong>{duration(total)}</strong></p></div><span className={`timer-state ${active && !active.paused ? 'is-running' : ''}`}>{active ? (active.paused ? 'Pausado' : 'Em andamento') : 'Pronto para iniciar'}</span></div>
      <p className="muted">Inicie quando começar. O cronômetro continua contando — mesmo pausado — se você navegar para outra página.</p>
      {otherActive ? <div className="timer-conflict" role="status"><span>Há outro cronômetro ativo. Você pode pará-lo agora ou iniciar este para trocar automaticamente.</span><button type="button" disabled={timerBusy} onClick={() => void stopOtherTimer()}>Parar o outro</button></div> : null}
      <div className="timer-actions" aria-label="Ações do cronômetro">
        {!active ? <button type="button" className="primary" disabled={timerBusy || activity.status !== 'pending'} onClick={() => void startTimer()}><Icon name="clock" />Iniciar cronômetro</button> : null}
        {active && !active.paused ? <button type="button" className="primary timer-stop" disabled={timerBusy} onClick={() => void pauseTimer()}><Icon name="clock" />Pausar cronômetro</button> : null}
        {active && active.paused ? <button type="button" className="primary" disabled={timerBusy} onClick={() => void resumeTimer()}><Icon name="clock" />Retomar</button> : null}
        {active ? <button type="button" disabled={timerBusy} onClick={() => void stopTimer('Cronômetro finalizado e tempo salvo.')}>Finalizar</button> : null}
      </div>
      <details className="manual-time-details"><summary>Adicionar tempo manualmente</summary><form className="manual-time" onSubmit={addManual}><label>Tempo em minutos <input name="minutes" type="number" min="1" max="1440" required placeholder="Ex.: 25" /></label><button>Adicionar</button></form></details>
      <div className="time-history-heading"><div><p className="eyebrow">Registros</p><h3>Histórico</h3></div><span>{visibleEntries.length ? `${visibleEntries.length} ${visibleEntries.length === 1 ? 'registro' : 'registros'}` : 'Nenhum registro'}</span></div>
      {visibleEntries.length ? <ul className="time-history">{visibleEntries.slice(0, 10).map(entry => <li key={entry.id}><span>{new Date(entry.startedAt).toLocaleDateString('pt-BR')}</span><strong>{duration(entry.endedAt ? entry.durationSeconds : accrued(entry as OpenEntry))}</strong><small>{entry.source === 'manual' ? 'Manual' : entry.source === 'timer' ? entry.endedAt ? 'Cronômetro' : entry.paused ? 'Pausado' : 'Em andamento' : 'Sessão recuperada'}</small></li>)}</ul> : <p className="muted time-history-empty">Inicie o cronômetro ou adicione um período manual para acompanhar seu tempo.</p>}
    </section><p role="status">{error || message}</p></main>;
}
