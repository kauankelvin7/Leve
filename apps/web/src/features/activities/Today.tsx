import { useEffect, useRef, useState, type FormEvent } from 'react';
import { collection, limit, query, where } from 'firebase/firestore';
import type { Activity, Category, Note, ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { firestore } from '../../platform/firebase';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection, useUserSubcollections } from '../content/useUserCollection';
import { Link, useSearchParams } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import { DayNavigation, useCurrentDay } from './DayNavigation';
import { useLiveQueries } from '../content/useLiveQueries';
import { LoadError } from '../../components/ui/LoadError';
import { ActivityColorPicker } from '../../components/ui/ActivityColorPicker';
import { LoadingState } from '../../components/ui/LoadingState';
import { Icon } from '../../components/ui/Icon';
import { formatCivilDate } from '../../platform/formatters';
import { DailyBrief } from './DailyBrief';

type StoredActivity = Activity & { id: string };

function describe(activity: StoredActivity) {
  if (activity.schedule.type === 'task')
    return activity.schedule.dueDate
      ? `${formatCivilDate(activity.schedule.dueDate)}${activity.schedule.dueTime ? ` às ${activity.schedule.dueTime}` : ''}`
      : 'Sem prazo';
  return activity.schedule.allDay
    ? `${formatCivilDate(activity.schedule.startDate)} · dia inteiro`
    : `${formatCivilDate(activity.schedule.startDate)} · ${activity.schedule.startTime}–${activity.schedule.endTime}`;
}

function timedEvent(activity: StoredActivity | null) {
  return activity?.schedule.type === 'event' && !activity.schedule.allDay
    ? activity.schedule
    : null;
}

export function Today() {
  const { user, session } = useAuth();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [searchParams] = useSearchParams();
  const [chosenDay, setChosenDay] = useState<string | null>(() => {
    try {
      const day = searchParams.get('dia');
      const remembered = sessionStorage.getItem('leve.selectedDay');
      return day ? Temporal.PlainDate.from(day).toString() : remembered ? Temporal.PlainDate.from(remembered).toString() : null;
    } catch { return null; }
  });
  const selectedDay = chosenDay ?? today;
  const selectDay = (day: string) => { sessionStorage.setItem('leve.selectedDay', day); setChosenDay(day); };
  const [composerOpen, setComposerOpen] = useState(searchParams.get('nova') === '1');
  useEffect(() => { if (searchParams.get('nova') === '1') setComposerOpen(true); }, [searchParams]);

  const { items: notes, error: noteError } = useUserCollection<Note>('notes');
  const { items: shoppingLists, error: shoppingError } = useUserCollection<ShoppingList>('shoppingLists');
  const pinnedNote = notes
    .filter(note => note.pinned && !note.deletedAt)
    .sort((l, r) => r.updatedAt.localeCompare(l.updatedAt))[0];
  const activeShoppingLists = shoppingLists.filter(l => !l.deletedAt && !l.archivedAt && l.listKind !== 'template');
  const shoppingItems = useUserSubcollections<ShoppingItem>('shoppingLists', activeShoppingLists.map(list => list.id), 'items');
  const pendingShoppingItems = activeShoppingLists.reduce((t, l) => t + (l.pendingItemCount ?? l.itemCount), 0);

  const composer = useRef<HTMLElement>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, Activity['status']>>({});
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('leve.today.statusFilter') ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('leve.today.categoryFilter') ?? 'all');
  const [busy, setBusy] = useState(false);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');
  const [kind, setKind] = useState<'task' | 'event'>('task');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('none');
  const [editScope, setEditScope] = useState<'occurrence' | 'future'>('occurrence');
  const [editing, setEditing] = useState<StoredActivity | null>(null);
  const { items: categories } = useUserCollection<Category>('categories');
  const pending = useRef<CommandEnvelope | null>(null);
  const futureSeriesId = useRef('');
  const editingEvent = timedEvent(editing);

  useEffect(() => { document.title = 'Meu dia · Leve'; }, []);

  const activityQuery = useLiveQueries(`today:${selectedDay}:${today}`, () => {
    if (!user || !firestore) return [];
    const root = collection(firestore, `users/${user.uid}/activities`);
    return [
      query(root, where('schedule.dueDate', '==', selectedDay), limit(50)),
      query(root, where('schedule.dueDate', '==', null), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDate', '>=', selectedDay), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDateExclusive', '>=', selectedDay), limit(50)),
    ];
  });

  const { loading } = activityQuery;
  const activities = (activityQuery.items as StoredActivity[])
    .filter(item => !item.deletedAt)
    .map(item => ({ ...item, status: optimisticStatus[item.id] ?? item.status }))
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      return 0;
    });

  function dotsOf(date: string) {
    return (activityQuery.items as StoredActivity[])
      .filter(item => !item.deletedAt && (
        (item.schedule.type === 'task' && item.schedule.dueDate === date) ||
        (item.schedule.type === 'event' && item.schedule.startDate <= date &&
          (item.schedule.allDay ? date < item.schedule.endDateExclusive : date <= item.schedule.endDate))
      ))
      .map(item => item.colorHex ?? categories.find(c => c.id === item.categoryId)?.colorHex ?? '#9EA7B0');
  }

  function startEdit(activity: StoredActivity) {
    setEditing(activity);
    setKind(activity.kind);
    setEventAllDay(activity.schedule.type === 'event' && activity.schedule.allDay);
    setEditScope('occurrence');
    futureSeriesId.current = crypto.randomUUID();
    pending.current = null;
    setComposerOpen(true);
    setTimeout(() => composer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get('title')).trim();
    if (!title) return;

    const dueDate = String(fields.get('dueDate') || '').trim() || null;
    const dueTime = String(fields.get('dueTime') || '').trim() || null;
    const startDate = String(fields.get('dueDate') || '').trim();
    const startTime = String(fields.get('dueTime') || '').trim();
    const endDate = String(fields.get('endDate') || '').trim();
    const endTime = String(fields.get('endTime') || '').trim();
    const endDateExclusive = String(fields.get('endDateExclusive') || '').trim();

    const timeZone = session?.profile?.timeZone ?? 'America/Sao_Paulo';
    const schedule = kind === 'task'
      ? { type: 'task' as const, dueDate, dueTime, timeZone, disambiguation: 'reject' as const }
      : eventAllDay
        ? { type: 'event' as const, allDay: true, startDate, endDateExclusive, timeZone }
        : { type: 'event' as const, allDay: false, startDate, startTime, endDate, endTime, timeZone, disambiguation: 'reject' as const };

    const reminderSpecs = fields.getAll('reminders').map(v => ({ id: `before-${v}`, minutesBefore: Number(v) }));
    const activity = {
      title,
      descriptionPlain: String(fields.get('description')).trim(),
      categoryId: String(fields.get('categoryId')) || null,
      colorHex: String(fields.get('colorHex') ?? '') || null,
      estimatedMinutes: Number(fields.get('estimatedMinutes')) || null,
      schedule,
      reminderSpecs,
    };

    const recurring = !editing && recurrenceFrequency !== 'none';
    const future = Boolean(editing?.seriesId) && editScope === 'future';
    const monthlyPolicy = fields.get('monthlyPolicy') === 'skip' ? 'skip' : 'lastDay';
    const payload = recurring
      ? { activity, recurrence: { frequency: recurrenceFrequency, interval: Number(fields.get('recurrenceInterval')) || 1, until: String(fields.get('recurrenceUntil')) || null, count: null, monthlyPolicy } }
      : future ? { activity, newSeriesId: futureSeriesId.current }
      : activity;

    const command = editing ? (future ? 'activity.updateFuture' : 'activity.update') : (recurring ? 'activity.createSeries' : 'activity.create');
    const entityId = editing?.id ?? pending.current?.entityId ?? crypto.randomUUID();
    const expectedRevision = editing?.revision ?? 0;

    if (!pending.current || pending.current.command !== command || pending.current.entityId !== entityId || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) {
      pending.current = { command, operationId: crypto.randomUUID(), entityId, expectedRevision, payload, clientCreatedAt: new Date().toISOString() };
    }

    setBusy(true); setMessage(''); setMessageTone('info');
    try {
      await sendCommand(pending.current);
      pending.current = null;
      setEditing(null); setComposerOpen(false);
      setKind('task'); setEventAllDay(false);
      setRecurrenceFrequency('none'); setEditScope('occurrence');
      form.reset();
      setMessage(editing ? 'Atividade atualizada.' : 'Atividade adicionada.'); setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar. Seu rascunho foi preservado.'); setMessageTone('error');
    } finally {
      setBusy(false);
    }
  }

  async function trash(activity: StoredActivity) {
    if (busy) return;
    setBusy(true); setMessage(''); setMessageTone('info');
    try {
      await sendCommand({ command: 'activity.trash', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setMessage('Atividade movida para a lixeira.'); setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível remover.'); setMessageTone('error');
    } finally { setBusy(false); }
  }

  async function toggle(activity: StoredActivity) {
    if (busy) return;
    const next = activity.status === 'completed' ? 'pending' : 'completed';
    setBusy(true); setMessage(''); setMessageTone('info');
    setOptimisticStatus(cur => ({ ...cur, [activity.id]: next }));
    try {
      await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: next }, clientCreatedAt: new Date().toISOString() });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar.'); setMessageTone('error');
      setOptimisticStatus(cur => { const n = { ...cur }; delete n[activity.id]; return n; });
    } finally { setBusy(false); }
  }

  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const plannedMinutes = activities.filter(a => a.status === 'pending').reduce((total, activity) => total + (activity.estimatedMinutes ?? 0), 0);
  const visibleActivities = activities.filter(activity => (statusFilter === 'all' || activity.status === statusFilter) && (categoryFilter === 'all' || (categoryFilter === 'none' ? !activity.categoryId : activity.categoryId === categoryFilter)));
  const activeCategories = categories.filter(c => !c.archivedAt && !c.deletedAt);

  useEffect(() => { localStorage.setItem('leve.today.statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('leve.today.categoryFilter', categoryFilter); }, [categoryFilter]);

  return (
    <main className="today-page">
      {/* Page header */}
      <header className="page-heading">
        <p className="eyebrow">Sua agenda</p>
        <h1 id="page-title" tabIndex={-1}>Meu dia</h1>
        <p className="user-greeting">Olá, <strong>{session!.profile!.displayName || 'que bom ter você aqui'}</strong>.</p>
        {!composerOpen && <button
          className="primary"
          onClick={() => { setEditing(null); setComposerOpen(true); }}
          aria-expanded={false}
        >
          <Icon name="plus" />Nova atividade
        </button>}
      </header>

      <section className="day-overview" aria-label="Resumo do dia selecionado">
        <div className="day-overview-date"><span>{Temporal.PlainDate.from(selectedDay).toLocaleString('pt-BR', { month: 'long' })}</span><strong>{Temporal.PlainDate.from(selectedDay).day}</strong><span>{Temporal.PlainDate.from(selectedDay).toLocaleString('pt-BR', { weekday: 'long' })}</span></div>
        <div className="day-overview-content"><p className="eyebrow">No seu ritmo</p><h2>{loading ? 'Abrindo o dia…' : pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'atividade para hoje' : 'atividades para hoje'}` : 'Espaço para seus planos'}</h2><p>{plannedMinutes ? `${plannedMinutes} minutos planejados neste dia.` : 'Organize o dia e encontre seus registros por aqui.'}</p><nav className="day-shortcuts" aria-label="Acessos rápidos"><Link to="/notas"><Icon name="note" />Notas</Link><Link to="/compras"><Icon name="basket" />Compras</Link><Link to="/revisao"><Icon name="clock" />Tempo registrado</Link></nav></div>
      </section>

      <div className="agenda-layout">
        {/* Main column */}
        <div>
          {/* Day navigation panel */}
          <section className="panel">
            <DayNavigation
              selected={selectedDay}
              today={today}
              weekStartsOn={session!.profile!.weekStartsOn}
              onSelect={selectDay}
              dotsOf={dotsOf}
            />
            <div className="section-heading">
              <strong>
                {Temporal.PlainDate.from(selectedDay).toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}
              </strong>
              <span className="count-badge">
                {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
            {plannedMinutes > 0 ? <p className="muted">{Math.floor(plannedMinutes / 60) ? `${Math.floor(plannedMinutes / 60)}h ` : ''}{plannedMinutes % 60 ? `${plannedMinutes % 60}min` : ''} planejados</p> : null}
          </section>

          <DailyBrief selectedDay={selectedDay} today={today} activities={activities} notes={notes} shoppingItems={shoppingItems.items} />

          {/* Composer */}
          {composerOpen && (
            <section ref={composer} className="panel activity-composer" aria-labelledby="new-activity">
              <h2 id="new-activity">{editing ? 'Editar atividade' : 'Nova atividade'}</h2>

              <form key={editing?.id ?? 'new'} onSubmit={save}>
                {/* Kind */}
                <label>
                  Tipo
                  <select
                    value={kind}
                    onChange={e => { setKind(e.target.value as 'task' | 'event'); setEventAllDay(false); pending.current = null; }}
                  >
                    <option value="task">Tarefa</option>
                    <option value="event">Compromisso</option>
                  </select>
                </label>

                {/* Title */}
                <label>
                  Título
                  <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={editing?.title ?? ''}
                    onChange={() => { pending.current = null; }}
                    autoFocus
                  />
                </label>

                {/* Category */}
                <label>
                  Categoria
                  <select name="categoryId" defaultValue={editing?.categoryId ?? ''}>
                    <option value="">Sem categoria</option>
                    {activeCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <ActivityColorPicker value={editing?.colorHex} />

                <label>
                  Tempo estimado <small>(minutos)</small>
                  <input name="estimatedMinutes" type="number" min="5" max="1440" step="5" defaultValue={editing?.estimatedMinutes ?? ''} placeholder="Ex.: 45" />
                </label>

                {/* Description */}
                <label>
                  Descrição
                  <textarea
                    name="description"
                    maxLength={5000}
                    rows={3}
                    defaultValue={editing?.descriptionPlain ?? ''}
                  />
                </label>

                {/* All-day toggle for events */}
                {kind === 'event' && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={e => setEventAllDay(e.target.checked)}
                    />
                    Compromisso de dia inteiro
                  </label>
                )}

                {/* Date fields */}
                <div className="date-fields">
                  <label>
                    {kind === 'task' ? 'Data' : 'Início'}
                    <input
                      name="dueDate"
                      type="date"
                      required={kind === 'event'}
                      defaultValue={
                        editing?.schedule.type === 'task' ? editing.schedule.dueDate ?? ''
                        : editing?.schedule.type === 'event' ? editing.schedule.startDate
                        : selectedDay
                      }
                    />
                  </label>
                  {(kind === 'task' || !eventAllDay) && (
                    <label>
                      Horário
                      <input
                        name="dueTime"
                        type="time"
                        required={kind === 'event'}
                        defaultValue={
                          editing?.schedule.type === 'task' ? editing.schedule.dueTime ?? ''
                          : editingEvent?.startTime ?? ''
                        }
                      />
                    </label>
                  )}
                </div>

                {/* Event end date/time */}
                {kind === 'event' && eventAllDay ? (
                  <label>
                    Fim <small>(dia seguinte ao último dia)</small>
                    <input
                      name="endDateExclusive"
                      type="date"
                      required
                      defaultValue={
                        editing?.schedule.type === 'event' && editing.schedule.allDay
                          ? editing.schedule.endDateExclusive
                          : ''
                      }
                    />
                  </label>
                ) : kind === 'event' ? (
                  <div className="date-fields">
                    <label>
                      Fim
                      <input name="endDate" type="date" required defaultValue={editingEvent?.endDate ?? ''} />
                    </label>
                    <label>
                      Horário final
                      <input name="endTime" type="time" required defaultValue={editingEvent?.endTime ?? ''} />
                    </label>
                  </div>
                ) : null}

                {/* Reminders */}
                <fieldset>
                  <legend>Lembretes</legend>
                  {[
                    { value: '0', label: 'No horário da atividade' },
                    { value: '30', label: '30 minutos antes' },
                    { value: '60', label: '1 hora antes' },
                    { value: '1440', label: '1 dia antes' },
                  ].map(r => (
                    <label key={r.value} className="check-label">
                      <input
                        type="checkbox"
                        name="reminders"
                        value={r.value}
                        defaultChecked={editing?.reminderSpecs.some(s => s.minutesBefore === Number(r.value))}
                      />
                      {r.label}
                    </label>
                  ))}
                </fieldset>

                {/* Recurrence (new) or series scope (edit) */}
                {!editing ? (
                  <fieldset>
                    <legend>Repetição</legend>
                    <label>
                      Frequência
                      <select value={recurrenceFrequency} onChange={e => setRecurrenceFrequency(e.target.value)}>
                        <option value="none">Não repetir</option>
                        <option value="daily">Diária</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </label>
                    {recurrenceFrequency !== 'none' && (
                      <>
                        <div className="date-fields">
                          <label>
                            Repetir a cada
                            <input name="recurrenceInterval" type="number" min="1" max="30" defaultValue="1" />
                          </label>
                          <label>
                            Até <small>(opcional)</small>
                            <input name="recurrenceUntil" type="date" min={selectedDay} />
                          </label>
                        </div>
                        {recurrenceFrequency === 'monthly' && (
                          <label>
                            Quando o dia não existir
                            <select name="monthlyPolicy" defaultValue="lastDay">
                              <option value="lastDay">Usar o último dia do mês</option>
                              <option value="skip">Pular aquele mês</option>
                            </select>
                          </label>
                        )}
                        <small className="field-hint">Sem data final, o Leve prepara as próximas 180 ocorrências.</small>
                      </>
                    )}
                  </fieldset>
                ) : editing.seriesId ? (
                  <fieldset>
                    <legend>Aplicar alteração</legend>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="editScope"
                        checked={editScope === 'occurrence'}
                        onChange={() => setEditScope('occurrence')}
                      />
                      Somente esta ocorrência
                    </label>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="editScope"
                        checked={editScope === 'future'}
                        onChange={() => setEditScope('future')}
                      />
                      Esta e as futuras
                    </label>
                  </fieldset>
                ) : null}

                <div className="dialog-actions">
                  <button className="primary" disabled={busy}>
                    {busy ? 'Salvando…' : editing ? 'Atualizar atividade' : 'Adicionar atividade'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { setEditing(null); setKind('task'); setComposerOpen(false); pending.current = null; }}
                  >
                    Cancelar
                  </button>
                </div>
                {message ? <p role={messageTone === 'error' ? 'alert' : 'status'} className={`form-status activity-form-status ${messageTone}`} aria-live="polite">{message}</p> : null}
              </form>
            </section>
          )}

          {/* Activity list */}
          <section className="real-activities" aria-labelledby="activity-title">
            <div className="section-heading">
              <h2 id="activity-title">Atividades</h2>
              <span className="muted">{visibleActivities.length} {visibleActivities.length === 1 ? 'item' : 'itens'}</span>
            </div>
            <div className="activity-filters" aria-label="Filtros de atividades">
              <label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="pending">Pendentes</option><option value="completed">Concluídas</option><option value="canceled">Canceladas</option></select></label>
              <label>Categoria<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">Todas</option><option value="none">Sem categoria</option>{activeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            </div>

            {!composerOpen && message ? <p role={messageTone === 'error' ? 'alert' : 'status'} className={`form-status activity-form-status ${messageTone}`} aria-live="polite">{message}</p> : null}

            {activityQuery.error && <LoadError message={activityQuery.error} retry={activityQuery.retry} />}

            {activityQuery.partial && (
              <p role="status">
                Há mais atividades neste dia. Use os filtros para encontrar o que procura.
              </p>
            )}

            {activityQuery.cached && activities.length > 0 && (
              <p className="muted" role="status">Mostrando o que já estava disponível. Reconectando…</p>
            )}

            {loading ? (
              <LoadingState label="Carregando seu dia…" />
            ) : visibleActivities.length ? (
              <ul>
                {visibleActivities.map(activity => {
                  const color = activity.colorHex ?? categories.find(c => c.id === activity.categoryId)?.colorHex ?? '#ddd';
                  const categoryName = categories.find(c => c.id === activity.categoryId)?.name ?? 'Sem categoria';
                  const isCompleted = activity.status === 'completed';

                  return (
                    <li
                      key={activity.id}
                      style={{ borderLeft: `4px solid ${color}` }}
                      aria-label={`${activity.title}${isCompleted ? ', concluída' : ''}`}
                    >
                      <div className="activity-manage">
                        <label>
                          {activity.kind === 'task' && (
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              disabled={busy}
                              onChange={() => void toggle(activity)}
                              aria-label={isCompleted ? 'Reabrir tarefa' : 'Concluir tarefa'}
                            />
                          )}
                          <span className={isCompleted ? 'completed' : ''}>
                            <strong><Link to={`/atividade/${activity.id}`}>{activity.title}</Link></strong>
                            <small>{describe(activity)} · {categoryName}{activity.estimatedMinutes ? ` · ${activity.estimatedMinutes} min estimados` : ''}</small>
                          </span>
                        </label>
                        <div className="row-actions">
                          <Link className="button activity-timer-link" to={`/atividade/${activity.id}#cronometro`} aria-label={`Abrir cronômetro de ${activity.title}`}>
                            <Icon name="clock" /><span>Cronômetro</span>
                          </Link>
                          <button
                            disabled={busy}
                            onClick={() => startEdit(activity)}
                            aria-label={`Editar ${activity.title}`}
                          >
                            Editar
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => void trash(activity)}
                            aria-label={`Excluir ${activity.title}`}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : !activityQuery.error ? (
              <div className="empty">
                <p>{activities.length ? 'Nenhuma atividade combina com estes filtros. Ajuste a seleção para ver outras.' : 'Seu dia está livre. Adicione uma atividade quando quiser.'}</p>
                <button
                  className="text-link"
                  onClick={() => { setEditing(null); setComposerOpen(true); }}
                >
                  Criar primeira atividade
                </button>
              </div>
            ) : null}
          </section>
        </div>

        {/* Aside */}
        <aside className="agenda-aside">
          <section className="panel">
            <DayNavigation
              month
              selected={selectedDay}
              today={today}
              weekStartsOn={session!.profile!.weekStartsOn}
              onSelect={selectDay}
              dotsOf={dotsOf}
            />
          </section>

          <article className={`note ${pinnedNote?.paperColorPreset ?? 'butter'}`}>
            <p className="note-kicker">Fixada no Meu dia</p>
            <h2>{pinnedNote?.title ?? 'Uma nota para lembrar'}</h2>
            <p>{pinnedNote?.plainText ?? 'Fixe uma nota para consultá-la aqui.'}</p>
            <Link to="/notas">Abrir notas</Link>
          </article>

          <Link className="panel shopping-summary" to="/compras">
            <strong>Compras</strong>
            <span>
              {pendingShoppingItems} {pendingShoppingItems === 1 ? 'item pendente' : 'itens pendentes'}{' '}
              em {activeShoppingLists.length} {activeShoppingLists.length === 1 ? 'lista' : 'listas'}
            </span>
          </Link>
        </aside>
      </div>

      {(noteError || shoppingError || shoppingItems.error) && <p role="alert" className="form-status activity-form-status error" aria-live="assertive">{noteError || shoppingError || shoppingItems.error}</p>}
    </main>
  );
}
