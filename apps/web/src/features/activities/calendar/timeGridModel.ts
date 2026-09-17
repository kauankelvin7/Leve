import type { CalendarEventViewModel } from './calendarModel';

export type TimeGridSegment = {
  event: CalendarEventViewModel;
  date: string;
  startMinute: number;
  endMinute: number;
  continuesFromPreviousDay: boolean;
  continuesToNextDay: boolean;
  lane: number;
  laneCount: number;
};

export type CalendarDayBuckets = {
  tasks: CalendarEventViewModel[];
  allDay: CalendarEventViewModel[];
  timed: TimeGridSegment[];
};

/** Converts a validated civil HH:mm value to the minute index used by the visual time grid. */
export function civilTimeToMinute(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`Invalid civil time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Projects one timed event onto one civil date without converting through the
 * device timezone. Multi-day events use the complete intermediate days and a
 * half-open end at midnight, matching the calendar's visual model.
 */
export function segmentTimedEventForDate(event: CalendarEventViewModel, date: string): TimeGridSegment | null {
  if (event.slot !== 'timed' || !event.startDate || !event.endDate || !event.startTime || !event.endTime) return null;
  if (date < event.startDate || date > event.endDate) return null;

  const startMinute = date === event.startDate ? civilTimeToMinute(event.startTime) : 0;
  const endMinute = date === event.endDate ? civilTimeToMinute(event.endTime) : 24 * 60;

  // An event ending exactly at 00:00 has no visible portion on its final day.
  if (endMinute <= startMinute) return null;

  return {
    event,
    date,
    startMinute,
    endMinute,
    continuesFromPreviousDay: date > event.startDate,
    continuesToNextDay: date < event.endDate,
    lane: 0,
    laneCount: 1,
  };
}

/**
 * Assigns deterministic side-by-side lanes to connected groups of overlapping
 * segments. This is rendering metadata only; it never mutates domain data.
 */
export function layoutTimedSegments(segments: TimeGridSegment[]): TimeGridSegment[] {
  const sorted = segments
    .map(segment => ({ ...segment, lane: 0, laneCount: 1 }))
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute || left.event.id.localeCompare(right.event.id));

  const result: TimeGridSegment[] = [];
  let cluster: TimeGridSegment[] = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (!cluster.length) return;

    const laneEnds: number[] = [];
    const placed = cluster.map(segment => {
      let lane = laneEnds.findIndex(endMinute => endMinute <= segment.startMinute);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(segment.endMinute);
      } else {
        laneEnds[lane] = segment.endMinute;
      }
      return { ...segment, lane };
    });

    const laneCount = Math.max(1, laneEnds.length);
    result.push(...placed.map(segment => ({ ...segment, laneCount })));
    cluster = [];
    clusterEnd = -1;
  }

  for (const segment of sorted) {
    if (cluster.length && segment.startMinute >= clusterEnd) flushCluster();
    cluster.push(segment);
    clusterEnd = Math.max(clusterEnd, segment.endMinute);
  }
  flushCluster();

  return result;
}

/** Splits one day's view without inventing durations for tasks or all-day items. */
export function calendarDayBuckets(events: CalendarEventViewModel[], date: string): CalendarDayBuckets {
  const tasks = events.filter(event => event.slot === 'task' && event.startDate === date);
  const allDay = events.filter(event => event.slot === 'all-day'
    && Boolean(event.startDate && event.endDateExclusive)
    && event.startDate! <= date
    && date < event.endDateExclusive!);
  const timed = layoutTimedSegments(events
    .map(event => segmentTimedEventForDate(event, date))
    .filter((segment): segment is TimeGridSegment => Boolean(segment)));

  return { tasks, allDay, timed };
}
