import { expect, it } from 'vitest';
import { readSummary } from '../../server/gika/readSummary';
import type { ReadItem, ReadResult } from '../../packages/domain/src/gika';
const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const item: ReadItem = { id: 'private-id', title: 'Private title', kind: 'task', status: 'pending', revision: 1,
  seriesId: null, occurrenceKey: null, schedule: { type: 'task', dueDate: context.today, dueTime: null, timeZone: context.timeZone, disambiguation: 'reject' } };
const read: ReadResult = { startDate: context.today, endDate: context.today, timeZone: context.timeZone, cached: false, partial: false, items: [item] };
it('summarizes verified unique results and statuses without inventing available time or leaking identity', () => {
  const text = readSummary([read, read], context);
  expect(text).toContain('uma atividade pendente');
  expect(text).not.toMatch(/private-id|Private title|livre|hora|salvei|criada/);
  expect(readSummary([{ ...read, items: [{ ...item, status: 'completed' }] }], context)).toContain('Sem pendências');
});
it('empty partial reads never become claims of an empty agenda', () => {
  expect(readSummary([{ ...read, partial: true, items: [] }], context)).toContain('parte');
  expect(readSummary([{ ...read, partial: true, items: [] }], context)).not.toContain('Não encontrei');
  expect(readSummary([{ ...read, items: [] }], context)).toContain('hoje');
});
