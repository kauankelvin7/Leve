import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import type { Activity, Category, TimeEntry } from '../../../../../packages/domain/src/content';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';

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
  return <main><header className="page-heading"><p className="eyebrow">Visão da semana</p><h1 id="page-title" tabIndex={-1}>Revisão</h1><p>Compare o tempo planejado com o registrado, sem metas automáticas.</p></header>
    <div className="review-grid" aria-busy={activityLoading || entryLoading}><section className="panel metric"><small>Tempo registrado</small><strong>{span(actual)}</strong><span>{previous ? `${actual >= previous ? '+' : ''}${actual - previous} min em relação à semana anterior` : 'Sem comparação anterior'}</span></section><section className="panel metric"><small>Tempo estimado</small><strong>{span(estimated)}</strong><span>{estimated ? `${actual - estimated >= 0 ? '+' : ''}${actual - estimated} min entre realizado e estimado` : 'Adicione estimativas às atividades'}</span></section><section className="panel metric"><small>Atividades concluídas</small><strong>{completed}</strong><span>de {relevant.length} nesta semana</span></section></div>
    <section className="panel review-breakdown"><div className="section-heading"><h2>Tempo por categoria</h2><Link to="/hoje?nova=1">Criar atividade</Link></div>{byCategory.length ? <ul>{byCategory.map(({ category, seconds }) => <li key={category.id}><span><i style={{ background: category.colorHex }} />{category.name}</span><strong>{span(minutes(seconds))}</strong></li>)}</ul> : <p>Nenhum tempo encerrado nesta semana.</p>}</section></main>;
}
