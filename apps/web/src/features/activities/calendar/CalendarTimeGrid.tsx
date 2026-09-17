import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEventViewModel } from './calendarModel';
import { calendarDayBuckets } from './timeGridModel';
import './calendar-time-grid.css';

const MINUTE_HEIGHT = 1;
const DAY_HEIGHT = 24 * 60 * MINUTE_HEIGHT;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type CalendarTimeGridProps = {
  view: 'week' | 'day';
  dates: string[];
  events: CalendarEventViewModel[];
  today: string;
  selectedDate: string;
  timeZone: string;
  onSelectDate: (date: string) => void;
};

function currentMinute(timeZone: string): number {
  const now = Temporal.Now.zonedDateTimeISO(timeZone);
  return now.hour * 60 + now.minute;
}

function timeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) return '';
  return endTime ? `${startTime}–${endTime}` : startTime;
}

export function CalendarTimeGrid({ view, dates, events, today, selectedDate, timeZone, onSelectDate }: CalendarTimeGridProps) {
  const [nowMinute, setNowMinute] = useState(() => currentMinute(timeZone));
  const buckets = useMemo(() => new Map(dates.map(date => [date, calendarDayBuckets(events, date)])), [dates, events]);
  const hasAllDay = dates.some(date => (buckets.get(date)?.allDay.length ?? 0) > 0);
  const hasTasks = dates.some(date => (buckets.get(date)?.tasks.length ?? 0) > 0);

  useEffect(() => {
    setNowMinute(currentMinute(timeZone));
    const timer = window.setInterval(() => setNowMinute(currentMinute(timeZone)), 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  const boardStyle = { '--calendar-day-count': dates.length } as React.CSSProperties;

  return (
    <section className={`calendar-time-view ${view}`} aria-label={view === 'week' ? 'Calendário da semana' : 'Calendário do dia'}>
      <div className="calendar-time-horizontal" tabIndex={0} aria-label={view === 'week' ? 'Deslize horizontalmente para percorrer a semana' : undefined}>
        <div className="calendar-time-board" style={boardStyle}>
          <div className="calendar-time-header-row">
            <span className="calendar-time-corner" aria-hidden="true" />
            <div className="calendar-time-date-grid">
              {dates.map(date => {
                const plain = Temporal.PlainDate.from(date);
                const isToday = date === today;
                const isSelected = date === selectedDate;
                return (
                  <button
                    type="button"
                    key={date}
                    className={`calendar-time-date${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => onSelectDate(date)}
                  >
                    <span>{plain.toLocaleString('pt-BR', { weekday: 'short' })}</span>
                    <strong>{plain.day}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          {hasAllDay ? (
            <div className="calendar-time-summary-row">
              <span className="calendar-time-row-label">Dia todo</span>
              <div className="calendar-time-date-grid">
                {dates.map(date => (
                  <div className="calendar-time-summary-cell" key={date}>
                    {buckets.get(date)?.allDay.map(event => (
                      <Link className="calendar-time-chip" key={event.id} to={`/atividade/${event.id}`} style={{ borderColor: event.color }}>
                        {event.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasTasks ? (
            <div className="calendar-time-summary-row">
              <span className="calendar-time-row-label">Tarefas</span>
              <div className="calendar-time-date-grid">
                {dates.map(date => (
                  <div className="calendar-time-summary-cell" key={date}>
                    {buckets.get(date)?.tasks.map(task => (
                      <Link className="calendar-time-chip task" key={task.id} to={`/atividade/${task.id}`} style={{ borderColor: task.color }}>
                        <span>{task.title}</span>
                        {task.startTime ? <small>{task.startTime}</small> : null}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="calendar-time-scroll">
            <div className="calendar-time-body" style={{ height: DAY_HEIGHT }}>
              <div className="calendar-time-axis" aria-hidden="true">
                {HOURS.map(hour => (
                  <span key={hour} style={{ top: hour * 60 * MINUTE_HEIGHT }}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              <div className="calendar-time-date-grid calendar-time-columns">
                {dates.map(date => {
                  const day = buckets.get(date)!;
                  return (
                    <div className={`calendar-time-column${date === today ? ' today' : ''}`} key={date} style={{ height: DAY_HEIGHT }}>
                      {date === today ? <span className="calendar-now-line" aria-hidden="true" style={{ top: nowMinute * MINUTE_HEIGHT }} /> : null}
                      {day.timed.map(segment => {
                        const duration = segment.endMinute - segment.startMinute;
                        const laneWidth = 100 / segment.laneCount;
                        const left = segment.lane * laneWidth;
                        return (
                          <Link
                            className={`calendar-time-event${segment.event.status === 'completed' ? ' completed' : ''}`}
                            key={`${segment.event.id}:${date}`}
                            to={`/atividade/${segment.event.id}`}
                            style={{
                              top: segment.startMinute * MINUTE_HEIGHT,
                              height: Math.max(duration * MINUTE_HEIGHT, 26),
                              left: `calc(${left}% + 3px)`,
                              width: `calc(${laneWidth}% - 6px)`,
                              borderColor: segment.event.color,
                              backgroundColor: `${segment.event.color}24`,
                            }}
                            aria-label={`${segment.event.title}. ${timeLabel(segment.event.startTime, segment.event.endTime)}`}
                          >
                            <strong>{segment.event.title}</strong>
                            <small>{timeLabel(segment.event.startTime, segment.event.endTime)}</small>
                            {segment.continuesFromPreviousDay ? <span className="sr-only">Continua do dia anterior.</span> : null}
                            {segment.continuesToNextDay ? <span className="sr-only">Continua no dia seguinte.</span> : null}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
