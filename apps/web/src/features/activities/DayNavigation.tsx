import { Temporal } from '@js-temporal/polyfill';
import { useEffect, useState } from 'react';

export function useCurrentDay(timeZone: string) {
  const [today, setToday] = useState(() => Temporal.Now.plainDateISO(timeZone).toString());
  useEffect(() => {
    const update = () => setToday(Temporal.Now.plainDateISO(timeZone).toString());
    update();
    const interval = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, [timeZone]);
  return today;
}

export function DayNavigation({ selected, today, weekStartsOn, onSelect, month = false }: { selected: string; today: string; weekStartsOn: number; onSelect: (value: string) => void; month?: boolean }) {
  const date = Temporal.PlainDate.from(selected);
  const base = month ? date.with({ day: 1 }) : date;
  const start = base.subtract({ days: (base.dayOfWeek % 7 - weekStartsOn + 7) % 7 });
  const days = Array.from({ length: month ? 42 : 7 }, (_, index) => start.add({ days: index }));
  return <section aria-label={month ? 'Calendário do mês' : 'Sua semana'}>
    <div className="toolbar"><h2>{month ? date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) : 'Sua semana'}</h2><div className="toolbar-actions">
      <button type="button" aria-label={month ? 'Mês anterior' : 'Semana anterior'} onClick={() => onSelect(date.subtract(month ? { months: 1 } : { weeks: 1 }).toString())}>‹</button>
      <button type="button" onClick={() => onSelect(today)}>Hoje</button>
      <button type="button" aria-label={month ? 'Próximo mês' : 'Próxima semana'} onClick={() => onSelect(date.add(month ? { months: 1 } : { weeks: 1 }).toString())}>›</button>
    </div></div>
    <div className={`day-picker ${month ? 'month-picker' : ''}`}>
      {month && days.slice(0, 7).map(day => <span className="mini-weekday" aria-hidden="true" key={`weekday-${day.dayOfWeek}`}>{day.toLocaleString('pt-BR', { weekday: 'narrow' })}</span>)}
      {days.map(day => <button type="button" key={day.toString()} className={day.equals(date) ? 'selected' : month && day.month !== date.month ? 'adjacent' : ''} aria-pressed={day.equals(date)} aria-current={day.toString() === today ? 'date' : undefined} aria-label={day.toLocaleString('pt-BR', { dateStyle: 'full' })} onClick={() => onSelect(day.toString())}>
        {!month && <span>{day.toLocaleString('pt-BR', { weekday: 'short' })}</span>}<strong>{day.day}</strong>
      </button>)}
    </div>
  </section>;
}
