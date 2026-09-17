import { describe, expect, it } from 'vitest';
import type { Activity } from '../../packages/domain/src/content';
import type { StoredActivity } from '../../apps/web/src/features/activities/calendar/calendarModel';
import {
  activityInputFromStored,
  calendarPoint,
  moveTimedActivity,
  resizeTimedActivity,
  snapCalendarMinute,
  timedActivityDurationMinutes,
} from '../../apps/web/src/features/activities/calendar/calendarMutationModel';

const meta = {
  revision: 4,
  schemaVersion: 1 as const,
  deletedAt: null,
  createdAt: '2026-09-17T10:00:00.000Z',
  updatedAt: '2026-09-17T10:00:00.000Z',
};

function stored(schedule: Activity['schedule'], overrides: Partial<Activity> = {}): StoredActivity {
  return {
    ...meta,
    id: 'activity-1',
    title: 'Consulta',
    descriptionPlain: 'Levar documentos',
    categoryId: 'cat-health',
    colorHex: '#557755',
    estimatedMinutes: 60,
    schedule,
    reminderSpecs: [{ id: 'before-30', minutesBefore: 30 }],
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

const timed = () => stored({
  type: 'event',
  allDay: false,
  startDate: '2026-09-17',
  startTime: '14:00',
  endDate: '2026-09-17',
  endTime: '15:30',
  timeZone: 'America/Sao_Paulo',
  disambiguation: 'reject',
});

describe('calendar mutation model', () => {
  it('snaps to 15-minute increments and clamps to the civil day', () => {
    expect(snapCalendarMinute(-20)).toBe(0);
    expect(snapCalendarMinute(7)).toBe(0);
    expect(snapCalendarMinute(8)).toBe(15);
    expect(snapCalendarMinute(67)).toBe(60);
    expect(snapCalendarMinute(68)).toBe(75);
    expect(snapCalendarMinute(1439)).toBe(1440);
    expect(snapCalendarMinute(2000)).toBe(1440);
    expect(snapCalendarMinute(Number.NaN)).toBe(0);
  });

  it('represents the end of a civil day as midnight on the following date', () => {
    expect(calendarPoint('2026-09-17', 0)).toEqual({ date: '2026-09-17', time: '00:00' });
    expect(calendarPoint('2026-09-17', 855)).toEqual({ date: '2026-09-17', time: '14:15' });
    expect(calendarPoint('2026-09-17', 1440)).toEqual({ date: '2026-09-18', time: '00:00' });
  });

  it('preserves all editable activity fields when creating an update payload', () => {
    expect(activityInputFromStored(timed())).toEqual({
      title: 'Consulta',
      descriptionPlain: 'Levar documentos',
      categoryId: 'cat-health',
      colorHex: '#557755',
      estimatedMinutes: 60,
      schedule: expect.objectContaining({ startDate: '2026-09-17', startTime: '14:00', endTime: '15:30' }),
      reminderSpecs: [{ id: 'before-30', minutesBefore: 30 }],
    });
  });

  it('calculates duration across the same day and midnight', () => {
    expect(timedActivityDurationMinutes(timed())).toBe(90);
    const overnight = stored({
      type: 'event', allDay: false,
      startDate: '2026-09-17', startTime: '23:30',
      endDate: '2026-09-18', endTime: '01:00',
      timeZone: 'America/Sao_Paulo', disambiguation: 'reject',
    });
    expect(timedActivityDurationMinutes(overnight)).toBe(90);
  });

  it('moves a timed event while preserving its duration and metadata', () => {
    const result = moveTimedActivity(timed(), '2026-09-18', 16 * 60 + 8);
    expect(result.schedule).toEqual({
      type: 'event', allDay: false,
      startDate: '2026-09-18', startTime: '16:15',
      endDate: '2026-09-18', endTime: '17:45',
      timeZone: 'America/Sao_Paulo', disambiguation: 'reject',
    });
    expect(result.reminderSpecs).toEqual([{ id: 'before-30', minutesBefore: 30 }]);
  });

  it('keeps duration when moving an event across midnight', () => {
    const result = moveTimedActivity(timed(), '2026-09-18', 23 * 60 + 30);
    expect(result.schedule).toMatchObject({
      startDate: '2026-09-18', startTime: '23:30',
      endDate: '2026-09-19', endTime: '01:00',
    });
  });

  it('resizes to a snapped end and supports midnight as the next civil date', () => {
    const sameDay = resizeTimedActivity(timed(), '2026-09-17', 16 * 60 + 7);
    expect(sameDay.schedule).toMatchObject({ endDate: '2026-09-17', endTime: '16:00' });

    const midnight = resizeTimedActivity(timed(), '2026-09-17', 1439);
    expect(midnight.schedule).toMatchObject({ endDate: '2026-09-18', endTime: '00:00' });
  });

  it('rejects resize shorter than 15 minutes or before the start', () => {
    expect(() => resizeTimedActivity(timed(), '2026-09-17', 14 * 60 + 7)).toThrow('pelo menos 15 minutos');
    expect(() => resizeTimedActivity(timed(), '2026-09-17', 13 * 60)).toThrow('pelo menos 15 minutos');
  });

  it('refuses to move or resize tasks and all-day events', () => {
    const task = stored({ type: 'task', dueDate: '2026-09-17', dueTime: '14:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' });
    const allDay = stored({ type: 'event', allDay: true, startDate: '2026-09-17', endDateExclusive: '2026-09-18', timeZone: 'America/Sao_Paulo' });
    expect(() => moveTimedActivity(task, '2026-09-18', 600)).toThrow('Apenas compromissos com horário');
    expect(() => resizeTimedActivity(allDay, '2026-09-18', 600)).toThrow('Apenas compromissos com horário');
  });
});
