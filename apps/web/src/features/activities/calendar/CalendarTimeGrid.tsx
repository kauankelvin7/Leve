import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import type { CalendarEventViewModel } from './calendarModel';
import { calendarDayBuckets } from './timeGridModel';
import { snapCalendarMinute } from './calendarMutationModel';
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
  onCreateInterval?: (date: string, startMinute: number, endMinute: number) => void;
  onMoveEvent?: (eventId: string, targetDate: string, targetMinute: number) => void;
  onResizeEvent?: (eventId: string, targetEndDate: string, targetEndMinute: number) => void;
  mutationDisabled?: boolean;
};

type IntervalSelection = {
  date: string;
  pointerId: number;
  anchorMinute: number;
  currentMinute: number;
};

type EventGesture = {
  kind: 'move' | 'resize';
  eventId: string;
  pointerId: number;
  targetDate: string;
  targetMinute: number;
};

function currentMinute(timeZone: string): number {
  const now = Temporal.Now.zonedDateTimeISO(timeZone);
  return now.hour * 60 + now.minute;
}

function timeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) return '';
  return endTime ? `${startTime}–${endTime}` : startTime;
}

function minuteLabel(minute: number): string {
  if (minute >= 24 * 60) return '00:00 do dia seguinte';
  const safe = Math.max(0, Math.min(24 * 60 - 1, minute));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function minuteFromPointer(event: React.PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(24 * 60, (event.clientY - rect.top) / MINUTE_HEIGHT));
}

function previewRange(selection: IntervalSelection): { startMinute: number; endMinute: number } {
  let startMinute = snapCalendarMinute(Math.min(selection.anchorMinute, selection.currentMinute));
  let endMinute = snapCalendarMinute(Math.max(selection.anchorMinute, selection.currentMinute));
  if (startMinute >= 24 * 60) startMinute = 23 * 60;
  if (endMinute <= startMinute) endMinute = Math.min(24 * 60, startMinute + 60);
  return { startMinute, endMinute };
}

export function CalendarTimeGrid({
  view,
  dates,
  events,
  today,
  selectedDate,
  timeZone,
  onSelectDate,
  onCreateInterval,
  onMoveEvent,
  onResizeEvent,
  mutationDisabled = false,
}: CalendarTimeGridProps) {
  const [nowMinute, setNowMinute] = useState(() => currentMinute(timeZone));
  const [selection, setSelection] = useState<IntervalSelection | null>(null);
  const [eventGesture, setEventGesture] = useState<EventGesture | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const buckets = useMemo(() => new Map(dates.map(date => [date, calendarDayBuckets(events, date)])), [dates, events]);
  const hasAllDay = dates.some(date => (buckets.get(date)?.allDay.length ?? 0) > 0);
  const hasTasks = dates.some(date => (buckets.get(date)?.tasks.length ?? 0) > 0);

  useEffect(() => {
    setNowMinute(currentMinute(timeZone));
    const timer = window.setInterval(() => setNowMinute(currentMinute(timeZone)), 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  const boardStyle = { '--calendar-day-count': dates.length } as React.CSSProperties;

  function beginSelection(event: React.PointerEvent<HTMLDivElement>, date: string) {
    if (!onCreateInterval || mutationDisabled || eventGesture || event.button !== 0 || event.pointerType === 'touch') return;
    if (event.target instanceof Element && event.target.closest('.calendar-time-event')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const minute = minuteFromPointer(event);
    setSelection({ date, pointerId: event.pointerId, anchorMinute: minute, currentMinute: minute });
  }

  function moveSelection(event: React.PointerEvent<HTMLDivElement>, date: string) {
    setSelection(current => {
      if (!current || current.pointerId !== event.pointerId || current.date !== date) return current;
      return { ...current, currentMinute: minuteFromPointer(event) };
    });
  }

  function finishSelection(event: React.PointerEvent<HTMLDivElement>, date: string) {
    if (!selection || selection.pointerId !== event.pointerId || selection.date !== date) return;
    const finalSelection = { ...selection, currentMinute: minuteFromPointer(event) };
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setSelection(null);
    onCreateInterval?.(date, finalSelection.anchorMinute, finalSelection.currentMinute);
  }

  function cancelSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!selection || selection.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setSelection(null);
  }

  function eventPoint(clientX: number, clientY: number): { date: string; minute: number } | null {
    const columns = columnsRef.current;
    if (!columns || dates.length === 0) return null;
    const rect = columns.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const relativeX = Math.max(0, Math.min(rect.width - 0.01, clientX - rect.left));
    const columnWidth = rect.width / dates.length;
    const columnIndex = Math.max(0, Math.min(dates.length - 1, Math.floor(relativeX / columnWidth)));
    const relativeY = Math.max(0, Math.min(DAY_HEIGHT, clientY - rect.top));

    return {
      date: dates[columnIndex]!,
      minute: snapCalendarMinute(relativeY / MINUTE_HEIGHT),
    };
  }

  function beginEventGesture(
    event: React.PointerEvent<HTMLSpanElement>,
    kind: EventGesture['kind'],
    eventId: string,
  ) {
    if (mutationDisabled || event.button !== 0 || event.pointerType === 'touch') return;
    const point = eventPoint(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection(null);
    setEventGesture({ kind, eventId, pointerId: event.pointerId, targetDate: point.date, targetMinute: point.minute });
  }

  function moveEventGesture(event: React.PointerEvent<HTMLSpanElement>) {
    setEventGesture(current => {
      if (!current || current.pointerId !== event.pointerId) return current;
      const point = eventPoint(event.clientX, event.clientY);
      return point ? { ...current, targetDate: point.date, targetMinute: point.minute } : current;
    });
  }

  function finishEventGesture(event: React.PointerEvent<HTMLSpanElement>) {
    if (!eventGesture || eventGesture.pointerId !== event.pointerId) return;
    const point = eventPoint(event.clientX, event.clientY);
    const finalGesture = point
      ? { ...eventGesture, targetDate: point.date, targetMinute: point.minute }
      : eventGesture;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setEventGesture(null);
    event.preventDefault();
    event.stopPropagation();

    if (finalGesture.kind === 'move') {
      onMoveEvent?.(finalGesture.eventId, finalGesture.targetDate, finalGesture.targetMinute);
    } else {
      onResizeEvent?.(finalGesture.eventId, finalGesture.targetDate, finalGesture.targetMinute);
    }
  }

  function cancelEventGesture(event: React.PointerEvent<HTMLSpanElement>) {
    if (!eventGesture || eventGesture.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setEventGesture(null);
    event.stopPropagation();
  }

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
              <div ref={columnsRef} className="calendar-time-date-grid calendar-time-columns">
                {dates.map(date => {
                  const day = buckets.get(date)!;
                  const preview = selection?.date === date ? previewRange(selection) : null;
                  const gestureTarget = eventGesture?.targetDate === date ? eventGesture : null;
                  return (
                    <div
                      className={`calendar-time-column${date === today ? ' today' : ''}${onCreateInterval ? ' can-create' : ''}`}
                      key={date}
                      style={{ height: DAY_HEIGHT }}
                      onPointerDown={event => beginSelection(event, date)}
                      onPointerMove={event => moveSelection(event, date)}
                      onPointerUp={event => finishSelection(event, date)}
                      onPointerCancel={cancelSelection}
                    >
                      {date === today ? <span className="calendar-now-line" aria-hidden="true" style={{ top: nowMinute * MINUTE_HEIGHT }} /> : null}
                      {preview ? <span
                        className="calendar-time-draft"
                        aria-hidden="true"
                        style={{
                          top: preview.startMinute * MINUTE_HEIGHT,
                          height: Math.max((preview.endMinute - preview.startMinute) * MINUTE_HEIGHT, 15),
                        }}
                      /> : null}
                      {gestureTarget ? <span
                        className={`calendar-time-gesture-target ${gestureTarget.kind}`}
                        aria-hidden="true"
                        style={{ top: Math.min(gestureTarget.targetMinute, 24 * 60 - 1) * MINUTE_HEIGHT }}
                      >
                        {gestureTarget.kind === 'move' ? 'Mover para' : 'Terminar às'} {minuteLabel(gestureTarget.targetMinute)}
                      </span> : null}
                      {day.timed.map(segment => {
                        const duration = segment.endMinute - segment.startMinute;
                        const laneWidth = 100 / segment.laneCount;
                        const left = segment.lane * laneWidth;
                        const canMove = Boolean(onMoveEvent && !mutationDisabled && !segment.continuesFromPreviousDay);
                        const canResize = Boolean(onResizeEvent && !mutationDisabled && !segment.continuesToNextDay);
                        return (
                          <div
                            className={`calendar-time-event${segment.event.status === 'completed' ? ' completed' : ''}${eventGesture?.eventId === segment.event.id ? ' gesturing' : ''}`}
                            key={`${segment.event.id}:${date}`}
                            style={{
                              top: segment.startMinute * MINUTE_HEIGHT,
                              height: Math.max(duration * MINUTE_HEIGHT, 26),
                              left: `calc(${left}% + 3px)`,
                              width: `calc(${laneWidth}% - 6px)`,
                              borderColor: segment.event.color,
                              backgroundColor: `${segment.event.color}24`,
                            }}
                          >
                            <Link
                              className="calendar-time-event-link"
                              to={`/atividade/${segment.event.id}`}
                              aria-label={`${segment.event.title}. ${timeLabel(segment.event.startTime, segment.event.endTime)}`}
                            >
                              <strong>{segment.event.title}</strong>
                              <small>{timeLabel(segment.event.startTime, segment.event.endTime)}</small>
                              {segment.continuesFromPreviousDay ? <span className="sr-only">Continua do dia anterior.</span> : null}
                              {segment.continuesToNextDay ? <span className="sr-only">Continua no dia seguinte.</span> : null}
                            </Link>
                            {canMove ? <span
                              className="calendar-time-move-handle"
                              aria-hidden="true"
                              title="Arraste para mover"
                              onPointerDown={event => beginEventGesture(event, 'move', segment.event.id)}
                              onPointerMove={moveEventGesture}
                              onPointerUp={finishEventGesture}
                              onPointerCancel={cancelEventGesture}
                            /> : null}
                            {canResize ? <span
                              className="calendar-time-resize-handle"
                              aria-hidden="true"
                              title="Arraste para mudar a duração"
                              onPointerDown={event => beginEventGesture(event, 'resize', segment.event.id)}
                              onPointerMove={moveEventGesture}
                              onPointerUp={finishEventGesture}
                              onPointerCancel={cancelEventGesture}
                            /> : null}
                          </div>
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
