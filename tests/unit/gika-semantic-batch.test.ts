import { describe, expect, it, vi } from 'vitest';
import { semanticBatch } from '../../server/gika/semanticTurn';
import { resolveBatch } from '../../server/gika/batchPolicy';
import type { ReadItem } from '../../packages/domain/src/gika';
const context = { today: '2026-10-05', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const item: ReadItem = { id: 'task', title: 'Caminhar', kind: 'task', status: 'pending', revision: 1, seriesId: null, occurrenceKey: null,
  schedule: { type: 'task', dueDate: context.today, dueTime: '07:00', timeZone: context.timeZone, disambiguation: 'reject' } };
const read = (items = [item], partial = false) => ({ startDate: context.today, endDate: context.today, timeZone: context.timeZone, partial, cached: false as const, items });
const request = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'essas pendências podem ficar para amanhã' };
const repository = { authorize: vi.fn(), read: vi.fn(), recoverMutation: vi.fn(), inspectRecurrence: vi.fn() };
const call = (scope: null | 'occurrence' | 'future' | 'all' = null) => ({ name: 'batch_reschedule', args: { sourceDate: context.today,
  title: null, excludeTitles: [], scope, dueDate: '2026-10-06', dueTime: null } });

describe('semantic batch interpretation preserves deterministic safeguards', () => {
  it('preserves omitted time and exclusions from the closed proposal without lexical parsing', async () => {
    const intent = semanticBatch({ ...call(), args: { ...call().args, excludeTitles: ['Estudar'] } }, context);
    expect(intent.patch).toEqual({ dueDate: '2026-10-06' });
    const result = await resolveBatch(intent, read([item, { ...item, id: 'excluded', title: 'Estudar' }]), repository, 'uid', request);
    expect('plan' in result).toBe(true);
    if ('plan' in result) expect(result.plan.items).toHaveLength(1);
    expect(repository.inspectRecurrence).not.toHaveBeenCalled();
  });
  it.each(['future', 'all'] as const)('never grants %s recurrence changes in a batch', async scope => {
    const result = await resolveBatch(semanticBatch(call(scope), context), read(), repository, 'uid', request);
    expect(result).toHaveProperty('clarification');
    expect(result).not.toHaveProperty('plan');
  });
  it('denies incomplete reads and oversized selections instead of truncating', async () => {
    for (const result of [
      await resolveBatch(semanticBatch(call(), context), read([item], true), repository, 'uid', request),
      await resolveBatch(semanticBatch(call(), context), read(Array.from({ length: 6 }, (_, i) => ({ ...item, id: `task-${i}` }))), repository, 'uid', request),
    ]) expect(result).not.toHaveProperty('plan');
  });
  it('rejects invalid dates, distant dates and identities before reading', () => {
    for (const override of [{ sourceDate: '2026-02-30' }, { dueDate: '2030-01-01' }, { uid: 'other' }])
      expect(() => semanticBatch({ ...call(), args: { ...call().args, ...override } }, context)).toThrow();
  });
});
