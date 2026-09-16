import type { Activity, Category } from '../../../../../../packages/domain/src/content';

export type StoredActivity = Activity & { id: string };

export type CalendarView = 'month' | 'week' | 'day';

export const CALENDAR_VIEW_STORAGE_KEY = 'leve.calendar.view';

export function isCalendarView(value: string | null): value is CalendarView {
  return value === 'month' || value === 'week' || value === 'day';
}

export function defaultCalendarView(viewportWidth: number): CalendarView {
  return viewportWidth < 768 ? 'day' : 'week';
}

export function normalizeCalendarPageSize(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

export function activityOccursOn(item: StoredActivity, date: string): boolean {
  const schedule = item.schedule;
  if (schedule.type === 'task') return schedule.dueDate === date;
  if (schedule.allDay) return schedule.startDate <= date && date < schedule.endDateExclusive;
  return schedule.startDate <= date && date <= schedule.endDate;
}

export function resolveActivityColor(item: StoredActivity, categories: Category[], fallback = '#9EA7B0'): string {
  return item.colorHex ?? categories.find(category => category.id === item.categoryId)?.colorHex ?? fallback;
}

export type CalendarEventViewModel = {
  id: string;
  revision: number;
  title: string;
  categoryId: string | null;
  color: string;
  slot: 'task' | 'all-day' | 'timed';
  startDate: string | null;
  endDate: string | null;
  endDateExclusive: string | null;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
  status: Activity['status'];
  seriesId: string | null;
  occurrenceKey: string | null;
};

/**
 * Keeps rendering libraries isolated from Firestore documents and mutation rules.
 * This adapter is deliberately lossless for the scheduling fields needed by
 * month/week/day views, while the Activity remains the source of truth.
 */
export function toCalendarEventViewModel(item: StoredActivity, color: string): CalendarEventViewModel {
  const schedule = item.schedule;
  if (schedule.type === 'task') {
    return {
      id: item.id,
      revision: item.revision,
      title: item.title,
      categoryId: item.categoryId,
      color,
      slot: 'task',
      startDate: schedule.dueDate,
      endDate: schedule.dueDate,
      endDateExclusive: null,
      startTime: schedule.dueTime,
      endTime: null,
      timeZone: schedule.timeZone,
      status: item.status,
      seriesId: item.seriesId,
      occurrenceKey: item.occurrenceKey,
    };
  }
  if (schedule.allDay) {
    return {
      id: item.id,
      revision: item.revision,
      title: item.title,
      categoryId: item.categoryId,
      color,
      slot: 'all-day',
      startDate: schedule.startDate,
      endDate: null,
      endDateExclusive: schedule.endDateExclusive,
      startTime: null,
      endTime: null,
      timeZone: schedule.timeZone,
      status: item.status,
      seriesId: item.seriesId,
      occurrenceKey: item.occurrenceKey,
    };
  }
  return {
    id: item.id,
    revision: item.revision,
    title: item.title,
    categoryId: item.categoryId,
    color,
    slot: 'timed',
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    endDateExclusive: null,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    timeZone: schedule.timeZone,
    status: item.status,
    seriesId: item.seriesId,
    occurrenceKey: item.occurrenceKey,
  };
}
