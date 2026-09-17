import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import type { ActivityInput, Category } from '../../../../../packages/domain/src/content';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection } from '../content/useUserCollection';
import { useCurrentDay } from './DayNavigation';
import { LoadError } from '../../components/ui/LoadError';
import { activityColorName } from '../../../../../packages/domain/src/activityColors';
import { Icon } from '../../components/ui/Icon';
import { ApiError, sendCommand } from '../../platform/api';
import {
  activityOccursOn,
  CALENDAR_VIEW_STORAGE_KEY,
  calendarViewBounds,
  defaultCalendarView,
  isCalendarView,
  resolveActivityColor,
  toCalendarEventViewModel,
  type CalendarView,
  type StoredActivity,
} from './calendar/calendarModel';
import { useCalendarRange } from './calendar/useCalendarRange';
import { CalendarTimeGrid } from './calendar/CalendarTimeGrid';
import { createPlannerDraft, plannerDraftToSearchParams } from './calendar/calendarDraftModel';
import { moveTimedActivity, resizeTimedActivity } from './calendar/calendarMutationModel';
import { buildCalendarUpdateCommand, type CalendarMutationScope } from './calendar/calendarCommandModel';
import { RecurrenceScopeDialog } from './calendar/RecurrenceScopeDialog';

type PendingCalendarMutation = {
  item: StoredActivity;
  activity: ActivityInput;
  action: 'move' | 'resize';
};

type MutationTone = 'success' | 'error' | 'info';

function initialCalendarView(): CalendarView {
  const stored = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
  if (isCalendarView(stored)) return stored;
  return defaultCalendarView(window.innerWidth);
}

function rangeDates(startDate: string, endDate: string): string[] {
  const start = Temporal.PlainDate.from(startDate);
  const end = Temporal.PlainDate.from(endDate);
  const days = start.until(end).days;
  return Array.from({ length: days + 1 }, (_, index) => start.add({ days: index }).toString());
}

function rangeTitle(view: CalendarView, startDate: string, endDate: string): string {
  const start = Temporal.PlainDate.from(startDate);
  if (view === 'month') return start.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  if (view === 'day') return start.toLocaleString('pt-BR', { dateStyle: 'full' });
  const end = Temporal.PlainDate.from(endDate);
  return `${start.toLocaleString('pt-BR', { day: 'numeric', month: 'short' })} – ${end.toLocaleString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function Calendar() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [selected, setSelected] = useState(() => sessionStorage.getItem('leve.selectedDay') ?? today);
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [view, setView] = useState<CalendarView>(initialCalendarView);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [pendingMutation, setPendingMutation] = useState<PendingCalendarMutation | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationMessage, setMutationMessage] = useState('');
  const [mutationTone, setMutationTone] = useState<MutationTone>('info');
  const [locallyPending, setLocallyPending] = useState<Record<string, number>>({});
  const mutationLock = useRef(false);
  const categories = useUserCollection<Category>('categories');
  const first = Temporal.PlainDate.from(`${month}-01`);
  const bounds = calendarViewBounds(view, view === 'month' ? `${month}-01` : selected, session!.profile!.weekStartsOn);
  const timeDates = useMemo(() => rangeDates(bounds.startDate, bounds.endDate), [bounds.startDate, bounds.endDate]);

  useEffect(() => { document.title = 'Calendário · Leve'; }, []);

  const activityQuery = useCalendarRange({ startDate: bounds.startDate, endDate: bounds.endDate, categoryId: category });
  const { loading, error, partial, items: activities } = activityQuery;
  const colorOf = (item: StoredActivity) => resolveActivityColor(item, categories.items);
  const timeEvents = useMemo(
    () => activities.map(item => toCalendarEventViewModel(item, colorOf(item))),
    [activities, categories.items],
  );

  useEffect(() => {
    setLocallyPending(current => {
      let changed = false;
      const next = { ...current };
      for (const [id, expectedRevision] of Object.entries(current)) {
        const live = activities.find(item => item.id === id);
        if (!live || live.revision > expectedRevision) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [activities]);

  const start = first.subtract({ days: (first.dayOfWeek % 7 - session!.profile!.weekStartsOn + 7) % 7 });
  const dates = Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  const onDay = (date: string) => activities.filter(item => activityOccursOn(item, date));
  const selectedItems = onDay(selected);
  const plannerLocked = mutationBusy || Boolean(pendingMutation) || Object.keys(locallyPending).length > 0;

  function rememberSelected(value: string) {
    setSelected(value);
    sessionStorage.setItem('leve.selectedDay', value);
  }

  function selectView(next: CalendarView) {
    setView(next);
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, next);
    setSheetOpen(false);
    if (next === 'month') setMonth(selected.slice(0, 7));
  }

  function changeRange(amount: number) {
    if (view === 'month') {
      const next = first.add({ months: amount }).toString();
      setMonth(next.slice(0, 7));
      rememberSelected(next);
      return;
    }
    const plain = Temporal.PlainDate.from(selected);
    const next = (view === 'week' ? plain.add({ weeks: amount }) : plain.add({ days: amount })).toString();
    setMonth(next.slice(0, 7));
    rememberSelected(next);
  }

  function goToday() {
    setMonth(today.slice(0, 7));
    rememberSelected(today);
  }

  function selectDay(value: string, adjacent = false) {
    rememberSelected(value);
    if (adjacent) setMonth(value.slice(0, 7));
    setSheetOpen(true);
  }

  function createFromInterval(date: string, startMinute: number, endMinute: number) {
    if (plannerLocked) return;
    try {
      const draft = createPlannerDraft(date, startMinute, endMinute);
      rememberSelected(draft.startDate);
      setMonth(draft.startDate.slice(0, 7));
      navigate(`/hoje?${plannerDraftToSearchParams(draft).toString()}`);
    } catch (failure) {
      setMutationMessage(failure instanceof Error ? failure.message : 'Não foi possível preparar este horário.');
      setMutationTone('error');
    }
  }

  function proposeMutation(item: StoredActivity, activity: ActivityInput, action: PendingCalendarMutation['action']) {
    setMutationMessage('');
    setMutationTone('info');
    const proposal = { item, activity, action };
    if (item.seriesId && item.occurrenceKey) {
      setPendingMutation(proposal);
      return;
    }
    void applyMutation(proposal, 'occurrence');
  }

  function moveEvent(eventId: string, targetDate: string, targetMinute: number) {
    if (plannerLocked) return;
    const item = activities.find(activity => activity.id === eventId);
    if (!item) {
      setMutationMessage('Este compromisso não está mais disponível neste intervalo.');
      setMutationTone('error');
      return;
    }
    try {
      proposeMutation(item, moveTimedActivity(item, targetDate, targetMinute), 'move');
    } catch (failure) {
      setMutationMessage(failure instanceof Error ? failure.message : 'Não foi possível calcular o novo horário.');
      setMutationTone('error');
    }
  }

  function resizeEvent(eventId: string, targetEndDate: string, targetEndMinute: number) {
    if (plannerLocked) return;
    const item = activities.find(activity => activity.id === eventId);
    if (!item) {
      setMutationMessage('Este compromisso não está mais disponível neste intervalo.');
      setMutationTone('error');
      return;
    }
    try {
      proposeMutation(item, resizeTimedActivity(item, targetEndDate, targetEndMinute), 'resize');
    } catch (failure) {
      setMutationMessage(failure instanceof Error ? failure.message : 'Não foi possível calcular a nova duração.');
      setMutationTone('error');
    }
  }

  async function applyMutation(proposal: PendingCalendarMutation, scope: CalendarMutationScope) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setMutationBusy(true);
    setPendingMutation(null);
    setMutationMessage('');
    setMutationTone('info');

    try {
      const command = buildCalendarUpdateCommand(proposal.item, proposal.activity, scope, {
        operationId: crypto.randomUUID(),
        clientCreatedAt: new Date().toISOString(),
        newSeriesId: scope === 'future' ? crypto.randomUUID() : undefined,
      });
      await sendCommand(command);
      setMutationMessage(scope === 'future' ? 'Este compromisso e os próximos foram atualizados.' : 'Horário atualizado.');
      setMutationTone('success');
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'SAVED_LOCALLY') {
        setLocallyPending(current => ({ ...current, [proposal.item.id]: proposal.item.revision }));
        setMutationMessage('Alteração salva neste aparelho. O Planner aguarda a conexão antes de aceitar outro ajuste de horário.');
        setMutationTone('info');
      } else if (failure instanceof ApiError && failure.code === 'REVISION_CONFLICT') {
        setMutationMessage('Este compromisso mudou em outra sessão. O horário exibido foi mantido; aguarde a atualização e tente novamente.');
        setMutationTone('error');
      } else {
        setMutationMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar o horário.');
        setMutationTone('error');
      }
    } finally {
      mutationLock.current = false;
      setMutationBusy(false);
    }
  }

  const viewName = view === 'month' ? 'mensal' : view === 'week' ? 'semanal' : 'diária';
  const title = rangeTitle(view, bounds.startDate, bounds.endDate);

  return <main className="calendar-page">
    <header className="page-heading">
      <p className="eyebrow">Visão {viewName}</p>
      <h1 id="page-title" tabIndex={-1}>Calendário</h1>
      <p>Seus compromissos e tarefas no ritmo que fizer mais sentido para o seu dia.</p>
      <Link className="button primary" to={`/hoje?dia=${selected}&nova=1`}><Icon name="plus" />Nova atividade</Link>
    </header>

    <div className="calendar-view-switcher" role="group" aria-label="Visualização do calendário">
      {(['month', 'week', 'day'] as const).map(option => <button
        type="button"
        key={option}
        className={view === option ? 'active' : ''}
        aria-pressed={view === option}
        onClick={() => selectView(option)}
      >{option === 'month' ? 'Mês' : option === 'week' ? 'Semana' : 'Dia'}</button>)}
    </div>

    <div className="calendar-filters">
      {view === 'month' ? <label className="month-field">Mês<input type="month" value={month} onChange={event => {
        if (/^\d{4}-\d{2}$/.test(event.target.value)) {
          setMonth(event.target.value);
          rememberSelected(`${event.target.value}-01`);
        }
      }} /></label> : <label>Data<input type="date" value={selected} onChange={event => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) {
          setMonth(event.target.value.slice(0, 7));
          rememberSelected(event.target.value);
        }
      }} /></label>}
      <label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.items.filter(item => !item.deletedAt && !item.archivedAt).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>

    {view === 'month' ? <section className="panel calendar-panel" aria-label="Calendário mensal" aria-busy={loading}>
      <div className="toolbar"><h2>{title}</h2><div className="toolbar-actions"><button onClick={goToday}>Hoje</button><button aria-label="Mês anterior" onClick={() => changeRange(-1)}><Icon name="chevronLeft" /></button><button aria-label="Próximo mês" onClick={() => changeRange(1)}><Icon name="chevronRight" /></button></div></div>
      <div className="calendar-weekdays" aria-hidden="true">{dates.slice(0, 7).map(date => <span key={date.toString()}>{date.toLocaleString('pt-BR', { weekday: 'short' })}</span>)}</div>
      <div className="calendar-grid">{dates.map(date => {
        const value = date.toString(); const adjacent = date.month !== first.month; const items = adjacent ? [] : onDay(value);
        return <button key={value} className={`calendar-day${adjacent ? ' adjacent' : ''}${value === selected ? ' selected' : ''}`} style={items[0] ? { backgroundColor: `${colorOf(items[0])}35` } : undefined} aria-pressed={value === selected} aria-current={value === today ? 'date' : undefined} aria-label={`${date.toLocaleString('pt-BR', { dateStyle: 'full' })}${adjacent || loading || error ? '' : `, ${items.length} atividades carregadas`}. Toque para ver o dia e adicionar uma atividade.`} onClick={() => selectDay(value, adjacent)}>
          <span className="calendar-date">{date.day}</span><span className="calendar-colors" aria-hidden="true">{items.slice(0, 4).map(item => <span className={item.status === 'pending' && value < today ? 'overdue' : ''} key={item.id} style={{ backgroundColor: colorOf(item) }} />)}</span><span className="calendar-previews" aria-hidden="true">{items.slice(0, 2).map(item => <span className={`calendar-event${item.status === 'completed' ? ' completed' : ''}${item.status === 'pending' && value < today ? ' overdue' : ''}`} key={item.id}>{item.title}</span>)}{items.length > 2 && <small>+{items.length - 2} atividades</small>}</span>{items.length > 0 && <span className="calendar-count" aria-hidden="true">{items.length}</span>}
        </button>;
      })}</div>
    </section> : <section className="panel calendar-time-panel" aria-label={`Calendário ${viewName}`} aria-busy={loading || mutationBusy}>
      <div className="toolbar"><h2>{title}</h2><div className="toolbar-actions"><button onClick={goToday}>Hoje</button><button aria-label={view === 'week' ? 'Semana anterior' : 'Dia anterior'} onClick={() => changeRange(-1)}><Icon name="chevronLeft" /></button><button aria-label={view === 'week' ? 'Próxima semana' : 'Próximo dia'} onClick={() => changeRange(1)}><Icon name="chevronRight" /></button></div></div>
      {mutationMessage ? <p role={mutationTone === 'error' ? 'alert' : 'status'} className={`form-status activity-form-status ${mutationTone}`} aria-live="polite">{mutationMessage}</p> : null}
      {loading ? <p role="status">Carregando atividades…</p> : error ? <LoadError message={error} retry={activityQuery.retry} /> : <CalendarTimeGrid
        view={view}
        dates={timeDates}
        events={timeEvents}
        today={today}
        selectedDate={selected}
        timeZone={session!.profile!.timeZone}
        onSelectDate={rememberSelected}
        onCreateInterval={createFromInterval}
        onMoveEvent={moveEvent}
        onResizeEvent={resizeEvent}
        mutationDisabled={plannerLocked}
      />}
      {partial ? <p role="status" className="muted">Há mais atividades neste intervalo. Abra um dia específico para conferir todos os itens.</p> : null}
    </section>}

    {view === 'month' ? <>{sheetOpen ? <button className="calendar-sheet-backdrop" aria-label="Fechar atividades do dia" onClick={() => setSheetOpen(false)} /> : null}<section className={`calendar-agenda${sheetOpen ? ' open' : ''}`} aria-labelledby="selected-date"><div className="section-heading"><h2 id="selected-date">{Temporal.PlainDate.from(selected).toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}</h2><div className="calendar-sheet-actions"><span className="count-badge">{selectedItems.length} atividades</span><button className="calendar-sheet-close" aria-label="Fechar" onClick={() => setSheetOpen(false)}><Icon name="close" /></button></div></div>
      {loading ? <p role="status">Carregando o mês…</p> : error ? <LoadError message={error} retry={activityQuery.retry} /> : selectedItems.length ? <ol className="calendar-list">{selectedItems.map(item => <li key={item.id} style={{ borderLeft: `5px solid ${colorOf(item)}` }}><Link to={`/atividade/${item.id}`}><strong>{item.title}</strong><small>{activityColorName(item.colorHex)} · {item.kind === 'event' ? 'Compromisso' : 'Tarefa'} · {item.status === 'completed' ? 'Concluído' : 'Pendente'}</small></Link></li>)}</ol> : <div className="empty"><p>Nenhuma atividade carregada para este dia{category ? ' nesta categoria' : ''}.</p><Link className="text-link" to={`/hoje?dia=${selected}&nova=1`}>Adicionar atividade</Link></div>}
      <Link className="button primary calendar-add" to={`/hoje?dia=${selected}&nova=1`}><Icon name="plus" />Adicionar neste dia</Link>{partial && <p role="status" className="muted">Há mais atividades neste mês. Abra o Meu dia para conferir uma data específica.</p>}{categories.error && <p role="status">{categories.error}</p>}
    </section></> : categories.error ? <p role="status">{categories.error}</p> : null}

    <RecurrenceScopeDialog
      open={Boolean(pendingMutation)}
      activityTitle={pendingMutation?.item.title ?? ''}
      busy={mutationBusy}
      onSelect={scope => {
        if (pendingMutation) void applyMutation(pendingMutation, scope);
      }}
      onCancel={() => setPendingMutation(null)}
    />
  </main>;
}