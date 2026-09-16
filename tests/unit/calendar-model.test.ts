import { describe, expect, it } from 'vitest';
import type { Activity, Category } from '../../packages/domain/src/content';
import {
  activityOccursOn,
  defaultCalendarView,
  isCalendarView,
  resolveActivityColor,
  toCalendarEventViewModel,
  type StoredActivity,
} from '../../apps/web/src/features/activities/calendar/calendarModel';

const meta = {
  revision: 1,
  schemaVersion: 1 as const,
  deletedAt: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
};

function storedActivity(id: string, schedule: Activity['schedule'], overrides: Partial<Activity> = {}): StoredActivity {
  return {
    ...meta,
    id,
    title: `Atividade ${id}`,
    descriptionPlain: '',
    categoryId: null,
    colorHex: null,
    estimatedMinutes: null,
    schedule,
    reminderSpecs: [],
    startsAt: null,
    endsAt: null,
    dueAt: null,
    kind: schedule.type === 'task' ? 'task' : 'event',
    status: 'pending',
    completedAt: null,
    seriesId: null,
    occurrenceKey: null,
    ...overrides,
  };
}

const category: Category = {
  ...meta,
  id: 'cat-health',
  name: 'Saúde',
  colorHex: '#557755',
  sortOrder: 0,
  archivedAt: null,
};

describe('calendar model', () => {
  it('uses day on small screens and week on wider screens while validating persisted views', () => {
    expect(defaultCalendarView(390)).toBe('day');
    expect(defaultCalendarView(767)).toBe('day');
    expect(defaultCalendarView(768)).toBe('week');
    expect(defaultCalendarView(1440)).toBe('week');
    expect(isCalendarView('month')).toBe(true);
    expect(isCalendarView('week')).toBe(true);
    expect(isCalendarView('day')).toBe(true);
    expect(isCalendarView('agenda')).toBe(false);
    expect(isCalendarView(null)).toBe(false);
  });

  it('places tasks only on their due date', () => {
    const task = storedActivity('task', { type: 'task', dueDate: '2026-09-20', dueTime: '09:30', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    expect(activityOccursOn(task, '2026-09-19')).toBe(false);
    expect(activityOccursOn(task, '2026-09-20')).toBe(true);
    expect(activityOccursOn(task, '2026-09-21')).toBe(false);
  });

  it('treats timed event end dates as inclusive and all-day end dates as exclusive', () => {
    const timed = storedActivity('timed', { type: 'event', allDay: false, startDate: '2026-09-20', startTime: '23:00', endDate: '2026-09-21', endTime: '01:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    const allDay = storedActivity('all-day', { type: 'event', allDay: true, startDate: '2026-09-20', endDateExclusive: '2026-09-22', timeZone: 'America/Sao_Paulo' });
    expect(activityOccursOn(timed, '2026-09-20')).toBe(true);
    expect(activityOccursOn(timed, '2026-09-21')).toBe(true);
    expect(activityOccursOn(timed, '2026-09-22')).toBe(false);
    expect(activityOccursOn(allDay, '2026-09-20')).toBe(true);
    expect(activityOccursOn(allDay, '2026-09-21')).toBe(true);
    expect(activityOccursOn(allDay, '2026-09-22')).toBe(false);
  });

  it('resolves explicit activity color before category color and keeps a safe fallback', () => {
    const explicit = storedActivity('explicit', { type: 'task', dueDate: null, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, { categoryId: category.id, colorHex: '#112233' });
    const inherited = storedActivity('inherited', { type: 'task', dueDate: null, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, { categoryId: category.id });
    const fallback = storedActivity('fallback', { type: 'task', dueDate: null, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    expect(resolveActivityColor(explicit, [category])).toBe('#112233');
    expect(resolveActivityColor(inherited, [category])).toBe('#557755');
    expect(resolveActivityColor(fallback, [category])).toBe('#9EA7B0');
  });

  it('adapts task, timed and all-day schedules without exposing Firestore-specific structure to the renderer', () => {
    const task = storedActivity('task', { type: 'task', dueDate: '2026-09-20', dueTime: '09:30', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    const timed = storedActivity('timed', { type: 'event', allDay: false, startDate: '2026-09-20', startTime: '14:00', endDate: '2026-09-20', endTime: '15:30', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    const allDay = storedActivity('all-day', { type: 'event', allDay: true, startDate: '2026-09-20', endDateExclusive: '2026-09-22', timeZone: 'America/Sao_Paulo' });
    expect(toCalendarEventViewModel(task, '#111111')).toMatchObject({ slot: 'task', startDate: '2026-09-20', startTime: '09:30', endTime: null });
    expect(toCalendarEventViewModel(timed, '#222222')).toMatchObject({ slot: 'timed', startDate: '2026-09-20', endDate: '2026-09-20', startTime: '14:00', endTime: '15:30' });
    expect(toCalendarEventViewModel(allDay, '#333333')).toMatchObject({ slot: 'all-day', startDate: '2026-09-20', endDateExclusive: '2026-09-22', startTime: null, endTime: null });
  });
});
