import { Temporal } from '@js-temporal/polyfill';
import { useEffect, useMemo, useState } from 'react';
import { collection, limit, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import type { Activity, Category } from '../../../../../packages/domain/src/content';
import { firestore } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection } from '../content/useUserCollection';
import { useCurrentDay } from './DayNavigation';
import { useLiveQueries } from '../content/useLiveQueries';
import { LoadError } from '../../components/ui/LoadError';
import { activityColorName } from '../../../../../packages/domain/src/activityColors';

type StoredActivity = Activity & { id: string };

export function Calendar() {
  const { user, session } = useAuth();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [category, setCategory] = useState('');
  const categories = useUserCollection<Category>('categories');
  const first = Temporal.PlainDate.from(`${month}-01`);
  const bounds = useMemo(() => ({ start: `${month}-01`, end: Temporal.PlainDate.from(`${month}-01`).add({ months: 1 }).subtract({ days: 1 }).toString() }), [month]);
  useEffect(() => { document.title = 'Calendário · Leve'; }, []);
  const activityQuery = useLiveQueries(`calendar:${month}`, () => {
    if (!user || !firestore) return [];
    const root = collection(firestore, `users/${user.uid}/activities`);
    return [
      query(root, where('schedule.dueDate', '>=', bounds.start), where('schedule.dueDate', '<=', bounds.end), limit(50)),
      query(root, where('schedule.startDate', '<=', bounds.end), where('schedule.endDate', '>=', bounds.start), limit(50)),
      query(root, where('schedule.startDate', '<=', bounds.end), where('schedule.endDateExclusive', '>', bounds.start), limit(50)),
    ];
  });
  const { loading, error, partial } = activityQuery;
  const activities = (activityQuery.items as StoredActivity[]).filter(item => !item.deletedAt);
  const colorOf = (item: StoredActivity) => item.colorHex ?? categories.items.find(category => category.id === item.categoryId)?.colorHex ?? '#9EA7B0';

  const start = first.subtract({ days: (first.dayOfWeek % 7 - session!.profile!.weekStartsOn + 7) % 7 });
  const dates = Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  const visible = activities.filter(item => !category || item.categoryId === category);
  const onDay = (date: string) => visible.filter(item => {
    const schedule = item.schedule;
    return schedule.type === 'task' ? schedule.dueDate === date : schedule.startDate <= date && (schedule.allDay ? date < schedule.endDateExclusive : date <= schedule.endDate);
  });
  function changeMonth(amount: number) {
    const next = first.add({ months: amount }).toString();
    setMonth(next.slice(0, 7)); setSelected(next);
  }
  const selectedItems = onDay(selected);
  return <main>
    <header className="page-heading"><p className="eyebrow">Visão mensal</p><h1 id="page-title" tabIndex={-1}>Calendário</h1><p>Seus compromissos e tarefas, um dia de cada vez.</p><Link className="button primary" to={`/hoje?dia=${selected}&nova=1`}>+ Nova atividade</Link></header>
    <div className="calendar-filters"><label className="month-field">Mês<input type="month" value={month} onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) { setMonth(event.target.value); setSelected(`${event.target.value}-01`); } }} /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.items.filter(item => !item.deletedAt && !item.archivedAt).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <section className="panel calendar-panel" aria-label="Calendário mensal" aria-busy={loading}>
      <div className="toolbar"><h2>{first.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2><div className="toolbar-actions"><button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Hoje</button><button aria-label="Mês anterior" onClick={() => changeMonth(-1)}>‹</button><button aria-label="Próximo mês" onClick={() => changeMonth(1)}>›</button></div></div>
      <div className="calendar-weekdays" aria-hidden="true">{dates.slice(0, 7).map(date => <span key={date.toString()}>{date.toLocaleString('pt-BR', { weekday: 'short' })}</span>)}</div>
      <div className="calendar-grid">{dates.map(date => {
        const value = date.toString(); const adjacent = date.month !== first.month; const items = adjacent ? [] : onDay(value);
        return <button key={value} className={`calendar-day${adjacent ? ' adjacent' : ''}${value === selected ? ' selected' : ''}`} style={items[0] ? { backgroundColor: `${colorOf(items[0])}35` } : undefined} aria-pressed={value === selected} aria-current={value === today ? 'date' : undefined} aria-label={`${date.toLocaleString('pt-BR', { dateStyle: 'full' })}${adjacent || loading || error ? '' : `, ${items.length} atividades carregadas`}`} onClick={() => { setSelected(value); if (adjacent) setMonth(value.slice(0, 7)); }}>
          <span className="calendar-date">{date.day}</span><span className="calendar-colors" aria-hidden="true">{items.slice(0, 10).map(item => <span key={item.id} style={{ backgroundColor: colorOf(item) }} />)}</span><span className="calendar-previews" aria-hidden="true">{items.slice(0, 2).map(item => <span className={`calendar-event${item.status === 'completed' ? ' completed' : ''}`} key={item.id}>{item.title}</span>)}{items.length > 2 && <small>+{items.length - 2} atividades</small>}</span>{items.length > 0 && <span className="calendar-count" aria-hidden="true">{items.length}</span>}
        </button>;
      })}</div>
    </section>
    <section className="calendar-agenda" aria-labelledby="selected-date"><div className="section-heading"><h2 id="selected-date">{Temporal.PlainDate.from(selected).toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}</h2><span className="count-badge">{selectedItems.length} atividades carregadas</span></div>
      {loading ? <p role="status">Carregando o mês…</p> : error ? <LoadError message={error} retry={activityQuery.retry} /> : selectedItems.length ? <ol className="calendar-list">{selectedItems.map(item => <li key={item.id} style={{ borderLeft: `5px solid ${colorOf(item)}` }}><Link to={`/atividade/${item.id}`}><strong>{item.title}</strong><small>{activityColorName(item.colorHex)} · {item.kind === 'event' ? 'Compromisso' : 'Tarefa'} · {item.status === 'completed' ? 'Concluído' : 'Pendente'}</small></Link></li>)}</ol> : <div className="empty"><p>Nenhuma atividade carregada para este dia{category ? ' nesta categoria' : ''}.</p><Link className="text-link" to={`/hoje?dia=${selected}&nova=1`}>Adicionar atividade</Link></div>}
      {partial && <p role="status" className="muted">Este mês atingiu o limite da consulta. A visão pode estar parcial; consulte o Meu dia para conferir uma data.</p>}{categories.error && <p role="status">{categories.error}</p>}
    </section>
  </main>;
}
