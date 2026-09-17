import { describe, expect, it } from 'vitest';
import type { ActivityInput } from '../../packages/domain/src/content';
import type { StoredActivity } from '../../apps/web/src/features/activities/calendar/calendarModel';
import { buildCalendarUpdateCommand } from '../../apps/web/src/features/activities/calendar/calendarCommandModel';

const schedule = {
  type: 'event' as const,
  allDay: false as const,
  startDate: '2026-09-17',
  startTime: '14:00',
  endDate: '2026-09-17',
  endTime: '15:00',
  timeZone: 'America/Sao_Paulo',
  disambiguation: 'reject' as const,
};

const activity: ActivityInput = {
  title: 'Consulta',
  descriptionPlain: '',
  categoryId: null,
  colorHex: null,
  estimatedMinutes: 60,
  schedule,
  reminderSpecs: [],
};

function stored(overrides: Partial<StoredActivity> = {}): StoredActivity {
  return {
    id: 'atividade-a',
    title: 'Consulta',
    descriptionPlain: '',
    categoryId: null,
    colorHex: null,
    estimatedMinutes: 60,
    schedule,
    reminderSpecs: [],
    kind: 'event',
    status: 'pending',
    revision: 4,
    schemaVersion: 1,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    deletedAt: null,
    completedAt: null,
    seriesId: null,
    occurrenceKey: null,
    startsAt: '2026-09-17T17:00:00.000Z',
    endsAt: '2026-09-17T18:00:00.000Z',
    dueAt: null,
    ...overrides,
  };
}

const ids = {
  operationId: '10000000-0000-4000-8000-000000000001',
  clientCreatedAt: '2026-09-17T10:00:00.000Z',
};

describe('calendar update command model', () => {
  it('builds an occurrence update with the current expected revision', () => {
    expect(buildCalendarUpdateCommand(stored(), activity, 'occurrence', ids)).toEqual({
      command: 'activity.update',
      operationId: ids.operationId,
      entityId: 'atividade-a',
      expectedRevision: 4,
      clientCreatedAt: ids.clientCreatedAt,
      payload: activity,
    });
  });

  it('builds a future-series update only for a recurring occurrence', () => {
    const item = stored({ seriesId: 'serie-a', occurrenceKey: '2026-09-17' });
    expect(buildCalendarUpdateCommand(item, activity, 'future', { ...ids, newSeriesId: 'serie-b' })).toEqual({
      command: 'activity.updateFuture',
      operationId: ids.operationId,
      entityId: 'atividade-a',
      expectedRevision: 4,
      clientCreatedAt: ids.clientCreatedAt,
      payload: { activity, newSeriesId: 'serie-b' },
    });
  });

  it('rejects future scope for a non-recurring activity or without a new series id', () => {
    expect(() => buildCalendarUpdateCommand(stored(), activity, 'future', { ...ids, newSeriesId: 'serie-b' })).toThrow(/recorrentes/i);
    expect(() => buildCalendarUpdateCommand(stored({ seriesId: 'serie-a', occurrenceKey: '2026-09-17' }), activity, 'future', ids)).toThrow(/identificador/i);
  });

  it('rejects an invalid stored revision instead of issuing an unsafe update', () => {
    expect(() => buildCalendarUpdateCommand(stored({ revision: 0 }), activity, 'occurrence', ids)).toThrow(/revisão válida/i);
  });
});
