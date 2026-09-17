import { Temporal } from '@js-temporal/polyfill';
import type { ActivityInput } from '../../../../../../packages/domain/src/content';
import type { StoredActivity } from './calendarModel';

const MINUTES_PER_DAY = 24 * 60;

function civilTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function snapCalendarMinute(value: number, step = 15): number {
  if (!Number.isFinite(value)) return 0;
  const safeStep = Number.isFinite(step) && step > 0 ? Math.max(1, Math.trunc(step)) : 15;
  const snapped = Math.round(value / safeStep) * safeStep;
  return Math.min(MINUTES_PER_DAY, Math.max(0, snapped));
}

export function calendarPoint(date: string, minute: number): { date: string; time: string } {
  const safeMinute = Math.min(MINUTES_PER_DAY, Math.max(0, Math.trunc(minute)));
  const base = Temporal.PlainDate.from(date);
  if (safeMinute === MINUTES_PER_DAY) return { date: base.add({ days: 1 }).toString(), time: '00:00' };
  return {
    date: base.toString(),
    time: civilTime(Math.floor(safeMinute / 60), safeMinute % 60),
  };
}

function plainDateTime(date: string, time: string) {
  return Temporal.PlainDateTime.from(`${date}T${time}`);
}

function timedScheduleOf(item: StoredActivity) {
  if (item.schedule.type !== 'event' || item.schedule.allDay) throw new Error('Apenas compromissos com horário podem ser movidos na grade.');
  return item.schedule;
}

export function activityInputFromStored(item: StoredActivity): ActivityInput {
  return {
    title: item.title,
    descriptionPlain: item.descriptionPlain,
    categoryId: item.categoryId,
    colorHex: item.colorHex ?? null,
    estimatedMinutes: item.estimatedMinutes ?? null,
    schedule: item.schedule,
    reminderSpecs: item.reminderSpecs,
  };
}

export function timedActivityDurationMinutes(item: StoredActivity): number {
  const schedule = timedScheduleOf(item);
  const start = plainDateTime(schedule.startDate, schedule.startTime);
  const end = plainDateTime(schedule.endDate, schedule.endTime);
  const minutes = start.until(end).total({ unit: 'minutes' });
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('O compromisso precisa ter duração positiva.');
  return minutes;
}

export function moveTimedActivity(item: StoredActivity, targetDate: string, targetMinute: number): ActivityInput {
  const schedule = timedScheduleOf(item);
  const durationMinutes = timedActivityDurationMinutes(item);
  const target = calendarPoint(targetDate, snapCalendarMinute(targetMinute));
  const start = plainDateTime(target.date, target.time);
  const end = start.add({ minutes: durationMinutes });

  return {
    ...activityInputFromStored(item),
    schedule: {
      ...schedule,
      startDate: start.toPlainDate().toString(),
      startTime: civilTime(start.hour, start.minute),
      endDate: end.toPlainDate().toString(),
      endTime: civilTime(end.hour, end.minute),
    },
  };
}

export function resizeTimedActivity(item: StoredActivity, targetEndDate: string, targetEndMinute: number): ActivityInput {
  const schedule = timedScheduleOf(item);
  const target = calendarPoint(targetEndDate, snapCalendarMinute(targetEndMinute));
  const start = plainDateTime(schedule.startDate, schedule.startTime);
  const end = plainDateTime(target.date, target.time);
  const durationMinutes = start.until(end).total({ unit: 'minutes' });
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) throw new Error('O compromisso precisa ter pelo menos 15 minutos.');

  return {
    ...activityInputFromStored(item),
    schedule: {
      ...schedule,
      endDate: end.toPlainDate().toString(),
      endTime: civilTime(end.hour, end.minute),
    },
  };
}
