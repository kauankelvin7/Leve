import { describe, expect, it } from 'vitest';
import type { CalendarEventViewModel } from '../../apps/web/src/features/activities/calendar/calendarModel';
import {
  calendarDayBuckets,
  civilTimeToMinute,
  layoutTimedSegments,
  segmentTimedEventForDate,
  type TimeGridSegment,
} from '../../apps/web/src/features/activities/calendar/timeGridModel';

function event(overrides: Partial<CalendarEventViewModel> & Pick<CalendarEventViewModel, 'id' | 'slot'>): CalendarEventViewModel {
  const { id, slot, ...rest } = overrides;
  return {
    revision: 1,
    title: id,
    categoryId: null,
    color: '#557755',
    startDate: null,
    endDate: null,
    endDateExclusive: null,
    startTime: null,
    endTime: null,
    timeZone: 'America/Sao_Paulo',
    status: 'pending',
    seriesId: null,
    occurrenceKey: null,
    ...rest,
    id,
    slot,
  };
}

function segment(id: string, startMinute: number, endMinute: number): TimeGridSegment {
  return {
    event: event({ id, slot: 'timed', startDate: '2026-09-17', endDate: '2026-09-17', startTime: '09:00', endTime: '10:00' }),
    date: '2026-09-17',
    startMinute,
    endMinute,
    continuesFromPreviousDay: false,
    continuesToNextDay: false,
    lane: 0,
    laneCount: 1,
  };
}

describe('time grid model', () => {
  it('converts civil time to minute indexes and rejects malformed values', () => {
    expect(civilTimeToMinute('00:00')).toBe(0);
    expect(civilTimeToMinute('14:15')).toBe(855);
    expect(civilTimeToMinute('23:59')).toBe(1439);
    expect(() => civilTimeToMinute('24:00')).toThrow();
    expect(() => civilTimeToMinute('9:30')).toThrow();
  });

  it('projects a same-day event onto its exact civil-time interval', () => {
    const item = event({ id: 'meeting', slot: 'timed', startDate: '2026-09-17', endDate: '2026-09-17', startTime: '14:00', endTime: '15:30' });
    expect(segmentTimedEventForDate(item, '2026-09-17')).toMatchObject({
      startMinute: 840,
      endMinute: 930,
      continuesFromPreviousDay: false,
      continuesToNextDay: false,
    });
  });

  it('projects multi-day events without using the device timezone', () => {
    const item = event({ id: 'trip', slot: 'timed', startDate: '2026-09-17', endDate: '2026-09-19', startTime: '22:30', endTime: '01:15' });
    expect(segmentTimedEventForDate(item, '2026-09-17')).toMatchObject({ startMinute: 1350, endMinute: 1440, continuesToNextDay: true });
    expect(segmentTimedEventForDate(item, '2026-09-18')).toMatchObject({ startMinute: 0, endMinute: 1440, continuesFromPreviousDay: true, continuesToNextDay: true });
    expect(segmentTimedEventForDate(item, '2026-09-19')).toMatchObject({ startMinute: 0, endMinute: 75, continuesFromPreviousDay: true, continuesToNextDay: false });
    expect(segmentTimedEventForDate(item, '2026-09-20')).toBeNull();
  });

  it('does not create a phantom segment when an event ends exactly at midnight', () => {
    const item = event({ id: 'overnight', slot: 'timed', startDate: '2026-09-17', endDate: '2026-09-18', startTime: '22:00', endTime: '00:00' });
    expect(segmentTimedEventForDate(item, '2026-09-17')).toMatchObject({ startMinute: 1320, endMinute: 1440 });
    expect(segmentTimedEventForDate(item, '2026-09-18')).toBeNull();
  });

  it('groups overlapping segments into deterministic lanes and resets lanes for independent clusters', () => {
    const laidOut = layoutTimedSegments([
      segment('a', 540, 660),
      segment('b', 570, 630),
      segment('c', 600, 720),
      segment('d', 780, 840),
    ]);

    expect(laidOut.filter(item => ['a', 'b', 'c'].includes(item.event.id)).map(item => item.laneCount)).toEqual([3, 3, 3]);
    expect(new Set(laidOut.filter(item => ['a', 'b', 'c'].includes(item.event.id)).map(item => item.lane)).size).toBe(3);
    expect(laidOut.find(item => item.event.id === 'd')).toMatchObject({ lane: 0, laneCount: 1 });
  });

  it('keeps tasks, all-day items and timed items in separate day buckets', () => {
    const buckets = calendarDayBuckets([
      event({ id: 'task-today', slot: 'task', startDate: '2026-09-17', startTime: '09:00' }),
      event({ id: 'task-other', slot: 'task', startDate: '2026-09-18' }),
      event({ id: 'all-day', slot: 'all-day', startDate: '2026-09-16', endDateExclusive: '2026-09-18' }),
      event({ id: 'all-day-ended', slot: 'all-day', startDate: '2026-09-15', endDateExclusive: '2026-09-17' }),
      event({ id: 'timed', slot: 'timed', startDate: '2026-09-17', endDate: '2026-09-17', startTime: '10:00', endTime: '11:00' }),
    ], '2026-09-17');

    expect(buckets.tasks.map(item => item.id)).toEqual(['task-today']);
    expect(buckets.allDay.map(item => item.id)).toEqual(['all-day']);
    expect(buckets.timed.map(item => item.event.id)).toEqual(['timed']);
  });
});
