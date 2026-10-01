import { describe, expect, it } from 'vitest';
import { batchPlanSchema, batchCommandFields, batchOperationId, batchResult, batchResultSchema } from '../../packages/domain/src/gikaBatch';
import { createConfirmationSigner } from '../../server/gika/confirmation';
import type { ReadRepository } from '../../server/gika/reads';
import type { ReadResult } from '../../packages/domain/src/gika';
import { resolveBatchIntent, resolveBatch, validateBatch } from '../../server/gika/batchPolicy';
const requestId = '3dad14e9-a25a-48a3-a5ab-d05d277c3991';
const item = { operationId: requestId, id: 'task', title: 'Academia', revision: 1, timeZone: 'America/Sao_Paulo', before: { dueDate: '2026-10-01', dueTime: '19:00' }, patch: { status: 'completed' as const }, scope: 'none' as const };
const plan = () => batchPlanSchema.parse({ action: 'complete', sourceDate: '2026-10-01', items: [item] });
const context = { today: '2026-10-01', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
describe('M5-T4 bounded batch contracts and deterministic explicit intent', () => {
  it('maps only minimal conventional command fields', () => {
    expect(batchCommandFields(plan(), 0)).toEqual({ command: 'activity.setStatus', operationId: requestId, entityId: 'task', expectedRevision: 1, payload: { status: 'completed' } });
    const move = batchPlanSchema.parse({ ...plan(), action: 'reschedule', items: [{ ...item, patch: { dueDate: '2026-10-02' } }] });
    expect(batchCommandFields(move, 0)).toMatchObject({ command: 'activity.update', payload: { dueDate: '2026-10-02' } });
  });
  it('rejects empty/oversized/duplicate targets and duplicate operation identities', () => {
    for (const items of [[], Array.from({ length: 6 }, (_, index) => ({ ...item, id: String(index), operationId: crypto.randomUUID() })), [item, item], [item, { ...item, id: 'other' }]]) expect(batchPlanSchema.safeParse({ ...plan(), items }).success).toBe(false);
  });
  it('rejects model-owned identifiers, mixed actions, unknown fields and future scope', () => {
    for (const changed of [{ ...item, uid: 'other' }, { ...item, patch: { status: 'completed', title: 'Injected' } }, { ...item, patch: { dueDate: '2026-10-02' } }, { ...item, scope: 'future' }, { ...item, before: { ...item.before, dueDate: '2026-10-02' } }]) expect(batchPlanSchema.safeParse({ ...plan(), items: [changed] }).success).toBe(false);
  });
  it('child identity is stable per UID/request/index and distinct for new intentions', async () => {
    const original = await batchOperationId('alice', requestId, 0);
    expect(await batchOperationId('alice', requestId, 0)).toBe(original);
    for (const other of [await batchOperationId('bob', requestId, 0), await batchOperationId('alice', requestId, 1), await batchOperationId('alice', crypto.randomUUID(), 0)]) expect(other).not.toBe(original);
    await expect(batchOperationId('alice', requestId, 5)).rejects.toThrow();
  });
  it('aggregate explicitly preserves partial/conflict/unknown states and rejects misleading counters', () => {
    const result = batchResult([{ id: 'a', title: 'A', status: 'applied', revision: 2 }, { id: 'b', title: 'B', status: 'conflict' }, { id: 'c', title: 'C', status: 'pending' }, { id: 'd', title: 'D', status: 'unknown' }]);
    expect(result).toMatchObject({ requested: 4, applied: 1, conflicts: 1, pending: 1, unknown: 1 });
    expect(batchResultSchema.safeParse({ ...result, applied: 4 }).success).toBe(false);
  });
  it('resolves explicit civil day/exclusion/time without inventing schedules', () => {
    expect(resolveBatchIntent('Move as tarefas de hoje para amanhã', context)).toMatchObject({ operation: 'reschedule', date: '2026-10-01', patch: { dueDate: '2026-10-02' } });
    expect(resolveBatchIntent('Conclui as tarefas de hoje exceto "Academia"', context)).toMatchObject({ operation: 'complete', excludeTitles: ['Academia'] });
    expect(resolveBatchIntent('Move as tarefas de hoje para sexta às 19h', context)).toMatchObject({ patch: { dueDate: '2026-10-02', dueTime: '19:00' } });
    expect(resolveBatchIntent('Move as tarefas de hoje para amanhã só estas ocorrências', context)).toMatchObject({ recurrenceScope: 'occurrence' });
  });
  it.each(['Organiza tudo', 'Conclui todas as tarefas', 'Apaga as tarefas de hoje', 'Move as tarefas importantes de hoje para amanhã', 'Move as tarefas de hoje para segunda que vem'])('unsupported/ambiguous request %s requires clarification', text => { expect(resolveBatchIntent(text, context)).toHaveProperty('clarification'); });
  it('maximum five-item recurring preview fits bounded token and HTTP payload contracts', () => {
    const worst = batchPlanSchema.parse({ action: 'complete', sourceDate: '2026-10-01', items: Array.from({ length: 5 }, (_, index) => ({ ...item, id: 'i'.repeat(120) + index, operationId: crypto.randomUUID(), title: '界'.repeat(120), scope: 'occurrence', recurrence: { seriesId: 's'.repeat(128), occurrenceKey: '2026-10-01', seriesHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), futureHash: 'c'.repeat(64), futureCount: 50, futureAllowed: true } })) });
    const confirmation = createConfirmationSigner(new Uint8Array(32), () => 1000).issueBatchConfirmation('u'.repeat(128), { requestId, text: 'Conclui as tarefas de hoje só estas ocorrências' }, worst);
    const tokenBytes = new TextEncoder().encode(confirmation.token).length;
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ batchConfirmation: confirmation })).length;
    expect(tokenBytes).toBeLessThan(12000); expect(bodyBytes).toBeLessThan(20000);
  });
  it('rejects provider drift in day, filters, patch, scope and unknown fields', () => {
    const text = 'Move as tarefas de hoje para amanhã', args = { sourceDate: '2026-10-01', title: null, excludeTitles: [], scope: null, dueDate: '2026-10-02', dueTime: null };
    expect(validateBatch(args, text, context, 'reschedule')).toMatchObject({ date: '2026-10-01', patch: { dueDate: '2026-10-02' } });
    for (const changed of [{ ...args, sourceDate: '2026-10-02' }, { ...args, title: 'Academia' }, { ...args, scope: 'future' }, { ...args, dueTime: '19:00' }, { ...args, uid: 'other' }]) expect(() => validateBatch(changed, text, context, 'reschedule')).toThrow();
  });
});

const read = (): ReadResult => ({ startDate: context.today, endDate: context.today, timeZone: context.timeZone, cached: false, partial: false, items: [{ id: 'a', title: 'Academia', revision: 1, kind: 'task', status: 'pending', seriesId: null, occurrenceKey: null, schedule: { type: 'task', dueDate: context.today, dueTime: null, timeZone: context.timeZone, disambiguation: 'reject' } }] });
const repository: ReadRepository = { authorize: async () => context, read: async () => read(), recoverMutation: async () => null };
describe('M5-T4 exact bounded target selection never silently truncates or guesses', () => {
  it.each(['partial', 'saturated', 'oversized', 'empty', 'future', 'all', 'missing-scope', 'noop'] as const)('%s blocks whole-plan authorization', async variant => {
    const data = read();
    let intent: Parameters<typeof resolveBatch>[0] = { operation: 'complete', date: context.today };
    if (variant === 'partial') data.partial = true;
    else if (variant === 'saturated' || variant === 'oversized') data.items = Array.from({ length: variant === 'saturated' ? 50 : 6 }, (_, index) => ({ ...data.items[0]!, id: String(index) }));
    else if (variant === 'empty') data.items = [];
    else if (variant === 'future' || variant === 'all') intent.recurrenceScope = variant;
    else if (variant === 'missing-scope') { data.items[0]!.seriesId = 'series'; data.items[0]!.occurrenceKey = context.today; }
    else intent = { operation: 'reschedule', date: context.today, patch: { dueDate: context.today } };
    expect(await resolveBatch(intent, data, repository, 'alice', { requestId, text: 'Synthetic explicit request' })).toHaveProperty('clarification');
  });
  it('selection uses exact case/trim matching and explicit exclusions, never substring/fuzzy', async () => {
    const selected = await resolveBatch({ operation: 'complete', date: context.today, title: '  ACADEMIA ' }, read(), repository, 'alice', { requestId, text: 'Synthetic explicit request' });
    expect(selected).toHaveProperty('plan');
    for (const intent of [{ operation: 'complete' as const, date: context.today, title: 'Acad' }, { operation: 'complete' as const, date: context.today, excludeTitles: [' academia '] }]) expect(await resolveBatch(intent, read(), repository, 'alice', { requestId, text: 'Synthetic explicit request' })).toHaveProperty('clarification');
  });
});
