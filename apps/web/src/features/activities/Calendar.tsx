import { Temporal } from '@js-temporal/polyfill';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Category } from '../../../../../packages/domain/src/content';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection } from '../content/useUserCollection';
import { useCurrentDay } from './DayNavigation';
import { LoadError } from '../../components/ui/LoadError';
import { activityColorName } from '../../../../../packages/domain/src/activityColors';
import { Icon } from '../../components/ui/Icon';
import { activityOccursOn, resolveActivityColor, type StoredActivity } from './calendar/calendarModel';
import { useCalendarRange } from './calendar/useCalendarRange';

export function Calendar() {
  const { session } = useAuth();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [selected, setSelected] = useState(() => sessionStorage.getItem('leve.selectedDay') ?? today);
  const [month, setMonth] = useState(selected.slice(0, 7));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState('');
  const categories = useUserCollection<Category>('categories');
  const first = Temporal.PlainDate.from(`${month}-01`);
  const bounds = useMemo(() => ({ start: `${month}-01`, end: Temporal.PlainDate.from(`${month}-01`).add({ months: 1 }).subtract({ days: 1 }).toString() }), [month]);
  useEffect(() => { document.title = 'Calendário · Leve'; }, []);
  const activityQuery = useCalendarRange({ startDate: bounds.start, endDate: bounds.end, categoryId: category });
  const { loading, error, partial, items: activities } = activityQuery;
  const colorOf = (item: StoredActivity) => resolveActivityColor(item, categories.items);

  const start = first.subtract({ days: (first.dayOfWeek % 7 - session!.profile!.weekStartsOn + 7) % 7 });
  const dates = Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  const onDay = (date: string) => activities.filter(item => activityOccursOn(item, date));
  function changeMonth(amount: number) {
    const next = first.add({ months: amount }).toString();
    setMonth(next.slice(0, 7)); setSelected(next); sessionStorage.setItem('leve.selectedDay', next);
  }
  const selectedItems = onDay(selected);
  const selectDay = (value: string, adjacent = false) => { setSelected(value); sessionStorage.setItem('leve.selectedDay', value); if (adjacent) setMonth(value.slice(0, 7)); setSheetOpen(true); };
  return <main className="calendar-page">
    <header className="page-heading"><p className="eyebrow">Visão mensal</p><h1 id="page-title" tabIndex={-1}>Calendário</h1><p>Seus compromissos e tarefas, um dia de cada vez.</p><Link className="button primary" to={`/hoje?dia=${selected}&nova=1`}><Icon name="plus" />Nova atividade</Link></header>
    <div className="calendar-filters"><label className="month-field">Mês<input type="month" value={month} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) { setMonth(event.target.value); setSelected(`${event.target.value}-01`); sessionStorage.setItem('leve.selectedDay', `${event.target.value}-01`); } }} /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.items.filter(item => !item.deletedAt && !item.archivedAt).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <section className="panel calendar-panel" aria-label="Calendário mensal" aria-busy={loading}>
      <div className="toolbar"><h2>{first.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2><div className="toolbar-actions"><button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); sessionStorage.setItem('leve.selectedDay', today); }}>Hoje</button><button aria-label="Mês anterior" onClick={() => changeMonth(-1)}><Icon name="chevronLeft" /></button><button aria-label="Próximo mês" onClick={() => changeMonth(1)}><Icon name="chevronRight" /></button></div></div>
      <div className="calendar-weekdays" aria-hidden="true">{dates.slice(0, 7).map(date => <span key={date.toString()}>{date.toLocaleString('pt-BR', { weekday: 'short' })}</span>)}</div>
      <div className="calendar-grid">{dates.map(date => {
        const value = date.toString(); const adjacent = date.month !== first.month; const items = adjacent ? [] : onDay(value);
        return <button key={value} className={`calendar-day${adjacent ? ' adjacent' : ''}${value === selected ? ' selected' : ''}`} style={items[0] ? { backgroundColor: `${colorOf(items[0])}35` } : undefined} aria-pressed={value === selected} aria-current={value === today ? 'date' : undefined} aria-label={`${date.toLocaleString('pt-BR', { dateStyle: 'full' })}${adjacent || loading || error ? '' : `, ${items.length} atividades carregadas`}. Toque para ver o dia e adicionar uma atividade.`} onClick={() => selectDay(value, adjacent)}>
          <span className="calendar-date">{date.day}</span><span className="calendar-colors" aria-hidden="true">{items.slice(0, 4).map(item => <span className={item.status === 'pending' && value < today ? 'overdue' : ''} key={item.id} style={{ backgroundColor: colorOf(item) }} />)}</span><span className="calendar-previews" aria-hidden="true">{items.slice(0, 2).map(item => <span className={`calendar-event${item.status === 'completed' ? ' completed' : ''}${item.status === 'pending' && value < today ? ' overdue' : ''}`} key={item.id}>{item.title}</span>)}{items.length > 2 && <small>+{items.length - 2} atividades</small>}</span>{items.length > 0 && <span className="calendar-count" aria-hidden="true">{items.length}</span>}
        </button>;
      })}</div>
    </section>
    {sheetOpen ? <button className="calendar-sheet-backdrop" aria-label="Fechar atividades do dia" onClick={() => setSheetOpen(false)} /> : null}<section className={`calendar-agenda${sheetOpen ? ' open' : ''}`} aria-labelledby="selected-date"><div className="section-heading"><h2 id="selected-date">{Temporal.PlainDate.from(selected).toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}</h2><div className="calendar-sheet-actions"><span className="count-badge">{selectedItems.length} atividades</span><button className="calendar-sheet-close" aria-label="Fechar" onClick={() => setSheetOpen(false)}><Icon name="close" /></button></div></div>
      {loading ? <p role="status">Carregando o mês…</p> : error ? <LoadError message={error} retry={activityQuery.retry} /> : selectedItems.length ? <ol className="calendar-list">{selectedItems.map(item => <li key={item.id} style={{ borderLeft: `5px solid ${colorOf(item)}` }}><Link to={`/atividade/${item.id}`}><strong>{item.title}</strong><small>{activityColorName(item.colorHex)} · {item.kind === 'event' ? 'Compromisso' : 'Tarefa'} · {item.status === 'completed' ? 'Concluído' : 'Pendente'}</small></Link></li>)}</ol> : <div className="empty"><p>Nenhuma atividade carregada para este dia{category ? ' nesta categoria' : ''}.</p><Link className="text-link" to={`/hoje?dia=${selected}&nova=1`}>Adicionar atividade</Link></div>}
      <Link className="button primary calendar-add" to={`/hoje?dia=${selected}&nova=1`}><Icon name="plus" />Adicionar neste dia</Link>{partial && <p role="status" className="muted">Há mais atividades neste mês. Abra o Meu dia para conferir uma data específica.</p>}{categories.error && <p role="status">{categories.error}</p>}
    </section>
  </main>;
}
