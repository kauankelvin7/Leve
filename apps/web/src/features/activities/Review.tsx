import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { Icon } from '../../components/ui/Icon';

function minutes(seconds: number) { return Math.round(seconds / 60); }
function span(value: number) { return value >= 60 ? `${Math.floor(value / 60)}h ${value % 60}min` : `${value}min`; }

export function Review() {
  const { session } = useAuth();
  const { items: activities, loading: activityLoading } = useUserCollection<Activity>('activities');
  const { items: entries, loading: entryLoading } = useUserCollection<TimeEntry>('timeEntries');
  const { items: categories } = useUserCollection<Category>('categories');
  useEffect(() => { document.title = 'Revisão · Leve'; }, []);
  const today = Temporal.Now.plainDateISO(session!.profile!.timeZone);
  const offset = (today.dayOfWeek - session!.profile!.weekStartsOn + 7) % 7;
  const start = today.subtract({ days: offset }).toString();
  const end = today.add({ days: 7 - offset }).toString();
  const previousStart = today.subtract({ days: offset + 7 }).toString();
  const relevant = activities.filter(item => !item.deletedAt && ((item.schedule.type === 'task' ? item.schedule.dueDate : item.schedule.startDate) ?? '') >= start && ((item.schedule.type === 'task' ? item.schedule.dueDate : item.schedule.startDate) ?? '') < end);
  const currentEntries = entries.filter(entry => !entry.deletedAt && entry.civilDate >= start && entry.civilDate < end);
  const previousEntries = entries.filter(entry => !entry.deletedAt && entry.civilDate >= previousStart && entry.civilDate < start);
  const actual = minutes(currentEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0));
  const previous = minutes(previousEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0));
  const estimated = relevant.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);
  const completed = relevant.filter(item => item.status === 'completed').length;
  const byCategory = categories.map(category => ({ category, seconds: currentEntries.filter(entry => activities.find(activity => activity.id === entry.activityId)?.categoryId === category.id).reduce((sum, entry) => sum + entry.durationSeconds, 0) })).filter(row => row.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const completion = relevant.length ? Math.round(completed / relevant.length * 100) : 0;
  const comparison = actual - previous;
  const maxCategorySeconds = Math.max(1, ...byCategory.map(row => row.seconds));
  const weekLabel = `${Temporal.PlainDate.from(start).toLocaleString('pt-BR', { day: 'numeric', month: 'short' })} a ${Temporal.PlainDate.from(end).subtract({ days: 1 }).toLocaleString('pt-BR', { day: 'numeric', month: 'short' })}`;
  return <main className="review-page"><header className="page-heading review-heading"><div><p className="eyebrow">Sua semana</p><h1 id="page-title" tabIndex={-1}>Revisão</h1><p>Um retrato simples do que foi planejado e do tempo que você registrou.</p></div><span className="review-period"><Icon name="calendar" />{weekLabel}</span></header>
    <section className="review-hero panel" aria-busy={activityLoading || entryLoading}>
      <div className="review-hero-copy"><span>Tempo registrado</span><strong>{span(actual)}</strong><p>{previous ? comparison === 0 ? 'O mesmo tempo da semana passada.' : `${Math.abs(comparison)} min ${comparison > 0 ? 'a mais' : 'a menos'} que na semana passada.` : 'A comparação aparecerá depois da sua primeira semana completa.'}</p></div>
      <div className="completion-ring" style={{ '--review-progress': `${completion * 3.6}deg` } as CSSProperties}><span><strong>{completion}%</strong><small>concluído</small></span></div>
    </section>
    <div className="review-grid"><section className="panel metric"><span className="metric-icon"><Icon name="clock" /></span><small>Tempo estimado</small><strong>{span(estimated)}</strong><span>{estimated ? actual === estimated ? 'Dentro do tempo previsto.' : `${span(Math.abs(actual - estimated))} ${actual > estimated ? 'além do previsto' : 'abaixo do previsto'}.` : 'Inclua uma estimativa nas atividades para comparar.'}</span></section><section className="panel metric"><span className="metric-icon"><Icon name="day" /></span><small>Atividades da semana</small><strong>{relevant.length}</strong><span>{completed} {completed === 1 ? 'concluída' : 'concluídas'} e {relevant.length - completed} {relevant.length - completed === 1 ? 'pendente' : 'pendentes'}.</span></section><section className="panel metric"><span className="metric-icon"><Icon name="note" /></span><small>Sessões registradas</small><strong>{currentEntries.length}</strong><span>{currentEntries.length ? 'Períodos manuais e sessões desta semana.' : 'Abra uma atividade para começar a registrar.'}</span></section></div>
    <section className="panel review-breakdown"><div className="section-heading"><div><p className="eyebrow">Distribuição</p><h2>Tempo por categoria</h2></div><Link className="button" to="/hoje?nova=1"><Icon name="plus" />Nova atividade</Link></div>{byCategory.length ? <ul>{byCategory.map(({ category, seconds }) => <li key={category.id}><div className="review-category-label"><span><i style={{ background: category.colorHex }} />{category.name}</span><strong>{span(minutes(seconds))}</strong></div><span className="review-category-track"><i style={{ width: `${Math.max(6, seconds / maxCategorySeconds * 100)}%`, background: category.colorHex }} /></span></li>)}</ul> : <div className="empty"><p>Nenhum tempo registrado nesta semana. Abra uma atividade e inicie o cronômetro quando começar.</p><Link className="text-link" to="/hoje">Ver atividades</Link></div>}</section></main>;
}
