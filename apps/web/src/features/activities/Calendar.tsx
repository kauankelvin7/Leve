import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import type { Activity } from '../../../../../packages/domain/src/content';
import { firestore } from '../../platform/firebase';
import { useAuth } from '../identity/AuthProvider';

type StoredActivity = Activity & { id: string };
function monthBounds(month: string) {
  const [year, number] = month.split('-').map(Number);
  const start = `${year}-${String(number).padStart(2, '0')}-01`;
  const next = new Date(Date.UTC(year!, number!, 1));
  const end = new Date(next.getTime() - 86400_000).toISOString().slice(0, 10);
  return { start, end };
}

export function Calendar() {
  const { user } = useAuth();
  const initial = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(initial); const [tasks, setTasks] = useState<StoredActivity[]>([]); const [events, setEvents] = useState<StoredActivity[]>([]); const [error, setError] = useState('');
  const bounds = useMemo(() => monthBounds(month), [month]);
  useEffect(() => { document.title = 'Calendário · Leve'; }, []);
  useEffect(() => {
    if (!user || !firestore) return;
    const root = collection(firestore, `users/${user.uid}/activities`);
    const failures = () => setError('Não foi possível carregar este mês.');
    const stopTasks = onSnapshot(query(root, where('schedule.dueDate', '>=', bounds.start), where('schedule.dueDate', '<=', bounds.end), limit(50)), snap => setTasks(snap.docs.map(item => ({ id: item.id, ...item.data() } as StoredActivity))), failures);
    const stopEvents = onSnapshot(query(root, where('schedule.startDate', '>=', bounds.start), where('schedule.startDate', '<=', bounds.end), limit(50)), snap => setEvents(snap.docs.map(item => ({ id: item.id, ...item.data() } as StoredActivity))), failures);
    return () => { stopTasks(); stopEvents(); };
  }, [user, bounds]);
  const days = [...tasks, ...events].filter(item => !item.deletedAt).sort((a, b) => {
    const aDate = a.schedule.type === 'task' ? a.schedule.dueDate ?? '' : a.schedule.startDate;
    const bDate = b.schedule.type === 'task' ? b.schedule.dueDate ?? '' : b.schedule.startDate;
    return aDate.localeCompare(bDate);
  });
  return <main><header className="page-heading"><p className="eyebrow">Visão mensal</p><h1 id="page-title" tabIndex={-1}>Calendário</h1></header><label className="month-field">Mês<input type="month" value={month} onChange={event => setMonth(event.target.value || initial)} /></label>
    {days.length ? <ol className="calendar-list">{days.map(item => <li key={item.id}><time>{item.schedule.type === 'task' ? item.schedule.dueDate : item.schedule.startDate}</time><strong>{item.title}</strong><small>{item.kind === 'event' ? 'Compromisso' : 'Tarefa'}</small></li>)}</ol> : <div className="empty"><p>Nenhuma atividade neste mês.</p></div>}<p role="status">{error}</p></main>;
}
