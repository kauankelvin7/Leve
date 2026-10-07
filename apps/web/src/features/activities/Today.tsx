import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { collection, limit, query, where } from 'firebase/firestore';
import { type Activity, type Category, type Note, type ShoppingItem, type ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { firestore } from '../../platform/firebase';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection, useUserSubcollections } from '../content/useUserCollection';
import { useSearchParams } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import { DayNavigation, useCurrentDay } from './DayNavigation';
import { useLiveQueries } from '../content/useLiveQueries';
import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DailyBrief } from './DailyBrief';
import { GikaSuggestion } from '../gika/GikaSuggestion';
import { plannerDraftFromSearchParams } from './calendar/calendarDraftModel';
import { PageHeader } from '../../components/ui/PageHeader';
import { TodayOverview } from './TodayOverview';
import type { StoredActivity } from './TodayActivityRow';
import { ActivityAgenda } from './ActivityAgenda';
import { ActivityComposer } from './ActivityComposer';
import { TodayAside } from './TodayAside';
import todayStyles from './Today.module.css';

export function Today() {
  const { user, session } = useAuth();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [searchParams, setSearchParams] = useSearchParams();
  const plannerDraftKey = searchParams.toString();
  const plannerDraft = useMemo(
    () => plannerDraftFromSearchParams(new URLSearchParams(plannerDraftKey)),
    [plannerDraftKey],
  );
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

  const composer = useRef<HTMLElement | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, Activity['status']>>({});
  const [message, setMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('leve.today.statusFilter') ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('leve.today.categoryFilter') ?? 'all');
  const [busy, setBusy] = useState(false);
  const [seriesToDelete, setSeriesToDelete] = useState<StoredActivity | null>(null);
  const [seriesDeleteError, setSeriesDeleteError] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');
  const [kind, setKind] = useState<'task' | 'event'>(() => plannerDraft ? 'event' : 'task');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('none');
  const [editScope, setEditScope] = useState<'occurrence' | 'future'>('occurrence');
  const [editing, setEditing] = useState<StoredActivity | null>(null);
  const { items: categories } = useUserCollection<Category>('categories');
  const pending = useRef<CommandEnvelope | null>(null);
  const futureSeriesId = useRef('');

  useEffect(() => { document.title = 'Meu dia · Leve'; }, []);
  useEffect(() => {
    if (!plannerDraft || editing || !composerOpen) return;
    setKind('event');
    setEventAllDay(false);
    setRecurrenceFrequency('none');
    pending.current = null;
  }, [plannerDraft, editing, composerOpen]);

  function clearCreationQuery() {
    const next = new URLSearchParams(searchParams);
    for (const key of ['nova', 'tipo', 'inicio', 'fimDia', 'fim']) next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function openNewActivity() {
    setEditing(null);
    setKind('task');
    setEventAllDay(false);
    setRecurrenceFrequency('none');
    pending.current = null;
    clearCreationQuery();
    setComposerOpen(true);
  }

  function closeComposer() {
    setEditing(null);
    setKind('task');
    setEventAllDay(false);
    setRecurrenceFrequency('none');
    pending.current = null;
    clearCreationQuery();
    setComposerOpen(false);
  }

  const activityQuery = useLiveQueries(`today:${selectedDay}:${today}`, () => {
    if (!user || !firestore) return [];
    const root = collection(firestore, `users/${user.uid}/activities`);
    return [
      query(root, where('schedule.dueDate', '==', selectedDay), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDate', '>=', selectedDay), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDateExclusive', '>', selectedDay), limit(50)),
    ];
  });

  const selectedDate = Temporal.PlainDate.from(selectedDay);
  const monthStart = selectedDate.with({ day: 1 });
  const calendarStart = monthStart.subtract({ days: (monthStart.dayOfWeek % 7 - session!.profile!.weekStartsOn + 7) % 7 });
  const calendarEnd = calendarStart.add({ days: 41 });
  const calendarQuery = useLiveQueries(`today-calendar:${calendarStart}:${calendarEnd}`, () => {
    if (!user || !firestore) return [];
    const root = collection(firestore, `users/${user.uid}/activities`);
    return [
      query(root, where('schedule.dueDate', '>=', calendarStart.toString()), where('schedule.dueDate', '<=', calendarEnd.toString()), limit(50)),
      query(root, where('schedule.startDate', '<=', calendarEnd.toString()), where('schedule.endDate', '>=', calendarStart.toString()), limit(50)),
      query(root, where('schedule.startDate', '<=', calendarEnd.toString()), where('schedule.endDateExclusive', '>', calendarStart.toString()), limit(50)),
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

  const calendarActivities = (calendarQuery.items as StoredActivity[]).filter(item => !item.deletedAt);
  function activitiesOn(date: string) {
    return calendarActivities.filter(item => (
      (item.schedule.type === 'task' && item.schedule.dueDate === date) ||
      (item.schedule.type === 'event' && item.schedule.startDate <= date &&
        (item.schedule.allDay ? date < item.schedule.endDateExclusive : date <= item.schedule.endDate))
    ));
  }

  function dotsOf(date: string) {
    return activitiesOn(date)
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
    const allDayEndDate = String(fields.get('allDayEndDate') || '').trim();
    const endDateExclusive = eventAllDay && (allDayEndDate || startDate)
      ? Temporal.PlainDate.from(allDayEndDate || startDate).add({ days: 1 }).toString()
      : '';

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
    const frequency = recurrenceFrequency === 'custom' ? String(fields.get('recurrenceUnit')) : recurrenceFrequency;
    const monthlyPolicy = fields.get('monthlyPolicy') === 'skip' ? 'skip' : 'lastDay';
    const payload = recurring
      ? { activity, recurrence: { frequency, interval: Number(fields.get('recurrenceInterval')) || 1, until: String(fields.get('recurrenceUntil') ?? '') || null, count: Number(fields.get('recurrenceCount')) || null, monthlyPolicy } }
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
      clearCreationQuery();
      form.reset();
      setMessage(editing ? 'Alterações salvas.' : kind === 'task' ? 'Tarefa adicionada ao dia.' : 'Compromisso adicionado ao dia.'); setMessageTone('success');
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

  async function trashSeries(activity: StoredActivity) {
    if (busy || !activity.seriesId) return;
    setSeriesDeleteError('');
    setBusy(true); setMessage(''); setMessageTone('info');
    try {
      await sendCommand({ command: 'activity.trashSeries', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: {}, clientCreatedAt: new Date().toISOString() });
      setSeriesToDelete(null);
      setMessage('A série inteira foi movida para a lixeira.'); setMessageTone('success');
    } catch (error) { const detail = error instanceof Error ? error.message : 'Não foi possível remover a série.'; setMessage(detail); setSeriesDeleteError(detail); setMessageTone('error'); }
    finally { setBusy(false); }
  }

  async function changeStatus(activity: StoredActivity, next: Activity['status']) {
    if (busy) return;
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
  const taskCount = activities.filter(a => a.kind === 'task' && a.status !== 'canceled').length;
  const completedTaskCount = activities.filter(a => a.kind === 'task' && a.status === 'completed').length;
  const pendingTaskCount = activities.filter(a => a.kind === 'task' && a.status === 'pending').length;
  const plannedMinutes = activities.filter(a => a.status === 'pending').reduce((total, activity) => total + (activity.estimatedMinutes ?? 0), 0);
  const visibleActivities = activities.filter(activity => (statusFilter === 'all' || activity.status === statusFilter) && (categoryFilter === 'all' || (categoryFilter === 'none' ? !activity.categoryId : activity.categoryId === categoryFilter)));
  const visibleTasks = visibleActivities.filter(activity => activity.kind === 'task');
  const visibleEvents = visibleActivities.filter(activity => activity.kind === 'event');
  const activeCategories = categories.filter(c => !c.archivedAt && !c.deletedAt);

  useEffect(() => { localStorage.setItem('leve.today.statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('leve.today.categoryFilter', categoryFilter); }, [categoryFilter]);

  return (
    <main className="today-page">
      <PageHeader
        className={todayStyles.heading}
        title="Meu dia"
        description={<span className="user-greeting">Olá, <strong>{session!.profile!.displayName || 'que bom ter você aqui'}</strong>.</span>}
        actions={!composerOpen && <button
          className="primary"
          onClick={openNewActivity}
          aria-expanded={false}
        >
          <Icon name="plus" />Nova atividade
        </button>}
      />

      <TodayOverview selectedDay={selectedDay} today={today} loading={loading} pendingTaskCount={pendingTaskCount} taskCount={taskCount} pendingCount={pendingCount} plannedMinutes={plannedMinutes} />

      <div className={todayStyles.layout}>
        {/* Main column */}
        <div>
          {/* Day navigation panel */}
          <section className={`panel ${todayStyles.weekPanel}`}>
            <DayNavigation
              selected={selectedDay}
              today={today}
              weekStartsOn={session!.profile!.weekStartsOn}
              onSelect={selectDay}
              dotsOf={dotsOf}
            />
          </section>

          {/* Composer */}
          {composerOpen ? <ActivityComposer
            composer={composer}
            editing={editing}
            kind={kind}
            setKind={setKind}
            eventAllDay={eventAllDay}
            setEventAllDay={setEventAllDay}
            recurrenceFrequency={recurrenceFrequency}
            setRecurrenceFrequency={setRecurrenceFrequency}
            editScope={editScope}
            setEditScope={setEditScope}
            selectedDay={selectedDay}
            plannerDraft={plannerDraft}
            activeCategories={activeCategories}
            busy={busy}
            message={message}
            messageTone={messageTone}
            onSave={save}
            onClose={closeComposer}
            clearPending={() => { pending.current = null; }}
          /> : null}

          <ActivityAgenda
            activities={activities}
            tasks={visibleTasks}
            events={visibleEvents}
            categories={categories}
            filterCategories={activeCategories}
            taskCount={taskCount}
            completedTaskCount={completedTaskCount}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            message={message}
            messageTone={messageTone}
            composerOpen={composerOpen}
            busy={busy}
            loading={loading}
            error={activityQuery.error}
            partial={activityQuery.partial}
            cached={activityQuery.cached}
            retry={activityQuery.retry}
            onStatusFilterChange={setStatusFilter}
            onCategoryFilterChange={setCategoryFilter}
            onCreate={openNewActivity}
            onChangeStatus={(activity, next) => void changeStatus(activity, next)}
            onEdit={startEdit}
            onTrash={activity => void trash(activity)}
            onTrashSeries={activity => { if (!busy) { setSeriesDeleteError(''); setSeriesToDelete(activity); } }}
          />

          <div className={todayStyles.support}>
            <GikaSuggestion key={session!.uid} uid={session!.uid} today={today} selectedDay={selectedDay} activities={activityQuery.items as StoredActivity[]} loading={activityQuery.loading} error={activityQuery.error} partial={activityQuery.partial} />
            <DailyBrief selectedDay={selectedDay} today={today} activities={activities} notes={notes} shoppingItems={shoppingItems.items} />
          </div>
        </div>

        <TodayAside
          selectedDay={selectedDay}
          today={today}
          weekStartsOn={session!.profile!.weekStartsOn}
          onSelectDay={selectDay}
          dotsOf={dotsOf}
          loading={calendarQuery.loading}
          partial={calendarQuery.partial}
          selectedActivityCount={activitiesOn(selectedDay).length}
          pinnedNote={pinnedNote}
          pendingShoppingItems={pendingShoppingItems}
          activeShoppingListCount={activeShoppingLists.length}
          onAddActivity={openNewActivity}
        />
      </div>

      {(noteError || shoppingError || shoppingItems.error) && <p role="alert" className="form-status activity-form-status error" aria-live="assertive">{noteError || shoppingError || shoppingItems.error}</p>}
      {seriesToDelete && <ConfirmDialog title="Excluir esta série?" onClose={() => { if (!busy) setSeriesToDelete(null); }}>
        <p>Você vai excluir a série <strong>{seriesToDelete.title}</strong>.</p>
        <p>As ocorrências já criadas, inclusive as passadas, serão movidas para a lixeira por 30 dias. A repetição será encerrada.</p>
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={() => setSeriesToDelete(null)}>Cancelar</button>
          <button type="button" className="danger" disabled={busy} onClick={() => void trashSeries(seriesToDelete)}>{busy ? 'Excluindo…' : 'Excluir série'}</button>
        </div>
        {seriesDeleteError && <p role="alert" className="form-status error">{seriesDeleteError}</p>}
      </ConfirmDialog>}
    </main>
  );
}
