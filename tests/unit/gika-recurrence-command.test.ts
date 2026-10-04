import { describe, expect, it } from 'vitest';
import { moveScheduleToDate } from '../../packages/domain/src/content';
import { recurrenceApplied, recurrenceCommandFields, recurrenceEffectSchema, recurrenceProposalSchema, type RecurrenceEffect } from '../../packages/domain/src/gikaRecurrence';
import { applyRecurrencePatch, assertRecurrenceSnapshot, inspectRecurrence } from '../../server/gika/recurrenceGuard';

const activity = { title: 'Academia', descriptionPlain: 'Nota privada preservada', categoryId: null, colorHex: '#123456', estimatedMinutes: 35, schedule: { type: 'task' as const, dueDate: '2026-10-01', dueTime: '19:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' as const }, reminderSpecs: [{ id: 'reminder', minutesBefore: 15 }] };
const series = { activity, recurrence: { frequency: 'daily', interval: 1, until: null, count: 3, monthlyPolicy: 'lastDay' }, revision: 1, schemaVersion: 1, materializedCount: 3, materializedThrough: '2026-10-03', state: 'active', createdAt: '2026-09-30T12:00:00.000Z' };
const member = (date: string) => ({ ...activity, schedule: moveScheduleToDate(activity.schedule, date), kind: 'task', status: 'pending', revision: 1, schemaVersion: 1, deletedAt: null, seriesId: 'series', occurrenceKey: date, createdAt: series.createdAt });
const target = member('2026-10-01');
const members = ['2026-10-01', '2026-10-02', '2026-10-03'].map((date, index) => ({ id: index === 0 ? 'target' : `next-${index}`, data: member(date) }));
const snapshot = () => inspectRecurrence('series', 'target', series, target, members)!;
const effect = (scope: 'occurrence' | 'future' = 'occurrence'): RecurrenceEffect => recurrenceEffectSchema.parse({ operation: 'update', task: { id: 'target', title: activity.title, dueDate: activity.schedule.dueDate, dueTime: activity.schedule.dueTime, timeZone: activity.schedule.timeZone, revision: 1 }, patch: { title: 'Treino' }, recurrence: snapshot(), scope, newSeriesId: scope === 'future' ? '3dad14e9-a25a-48a3-a5ab-d05d277c3991' : null });

describe('M5-T3 command contract preserves conventional occurrence and future semantics', () => {
  it('explicit scopes map only to existing conventional writers with minimal patches', () => {
    expect(recurrenceCommandFields(effect())).toEqual({ command: 'activity.update', entityId: 'target', expectedRevision: 1, payload: { title: 'Treino' } });
    expect(recurrenceCommandFields(effect('future'))).toEqual({ command: 'activity.updateFuture', entityId: 'target', expectedRevision: 1, payload: { patch: { title: 'Treino' }, newSeriesId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991' } });
  });
  it('does not invent future completion, all scope, UID, full replacement or unknown patch fields', () => {
    const original = effect();
    for (const value of [{ ...original, scope: 'all' }, { ...original, uid: 'other' }, { ...original, patch: { title: 'Treino', dueDate: '2026-10-02' } }, { ...original, operation: 'complete', patch: { status: 'completed' }, scope: 'future' }]) expect(recurrenceEffectSchema.safeParse(value).success).toBe(false);
    expect(recurrenceProposalSchema.safeParse({ ...original, scope: undefined, newSeriesId: undefined }).success).toBe(false);
  });
  it('requires new software identity and a safe complete future set for future scope', () => {
    const original = effect('future');
    for (const value of [{ ...original, newSeriesId: null }, { ...original, recurrence: { ...original.recurrence, futureAllowed: false } }, { ...original, recurrence: { ...original.recurrence, futureHash: null } }, { ...original, recurrence: { ...original.recurrence, futureCount: 1 } }]) expect(recurrenceEffectSchema.safeParse(value).success).toBe(false);
  });
  it('bounded inspection distinguishes a safe future set from saturation without disabling occurrence', () => {
    expect(snapshot()).toMatchObject({ futureAllowed: true, futureCount: 3 });
    const saturated = inspectRecurrence('series', 'target', series, target, Array.from({ length: 51 }, (_, i) => ({ id: String(i), data: target })))!;
    expect(saturated).toMatchObject({ futureAllowed: false, futureHash: null, futureCount: 0 });
    expect(recurrenceEffectSchema.safeParse({ ...effect(), recurrence: saturated }).success).toBe(true);
  });
  it.each([{ status: 'completed' }, { status: 'canceled' }, { deletedAt: '2026-10-01' }, { revision: 2 }, { descriptionPlain: 'Edição individual posterior' }, { schedule: { ...activity.schedule, dueDate: '2026-10-02', dueTime: '20:00' } }])('future never resets completed/deleted/edited occurrence: %j', changes => {
    const changed = members.map((item, index) => index === 1 ? { ...item, data: { ...item.data, ...changes } } : item);
    expect(inspectRecurrence('series', 'target', series, target, changed)?.futureAllowed).toBe(false);
  });
  it('target/sibling/materialization/series deletion changes invalidate the sealed snapshot', () => {
    const original = effect('future');
    expect(() => assertRecurrenceSnapshot(original, series, target, members)).not.toThrow();
    expect(() => assertRecurrenceSnapshot(original, series, { ...target, createdAt: '2026-10-01T12:00:00.000Z' }, members)).toThrow();
    expect(() => assertRecurrenceSnapshot(original, { ...series, materializedCount: 4 }, target, members)).toThrow();
    expect(() => assertRecurrenceSnapshot(original, series, target, members.map((item, index) => index ? { ...item, data: { ...item.data, revision: 2 } } : item))).toThrow();
    expect(inspectRecurrence('series', 'target', { ...series, state: 'trashed' }, target, members)).toBeNull();
    expect(inspectRecurrence('series', 'target', { ...series, deletedAt: '2026-10-01' }, target, members)).toBeNull();
  });
  it('missing materialized future occurrence or duplicate key cannot be treated as past during split', () => {
    expect(inspectRecurrence('series', 'target', series, target, members.slice(0, 2))?.futureAllowed).toBe(false);
    expect(inspectRecurrence('series', 'target', series, target, [members[0]!, members[1]!, { id: 'duplicate', data: members[1]!.data }])?.futureAllowed).toBe(false);
    expect(inspectRecurrence('series', 'target', { ...series, materializedCount: 5001 }, target, members)?.futureAllowed).toBe(false);
  });
  it('title patch preserves non-requested data; date-only preserves exact time and absence', () => {
    expect(applyRecurrencePatch(target, effect())).toEqual({ ...activity, title: 'Treino' });
    const move = recurrenceEffectSchema.parse({ ...effect(), operation: 'reschedule', patch: { dueDate: '2026-10-02' } });
    expect(applyRecurrencePatch(target, move)).toEqual({ ...activity, schedule: { ...activity.schedule, dueDate: '2026-10-02' } });
    const timeless = { ...target, reminderSpecs: [], schedule: { ...target.schedule, dueTime: null } };
    expect(applyRecurrencePatch(timeless, move).schedule).toMatchObject({ dueTime: null });
  });
  it('structured success requires the exact conventional ack identity/revision', () => {
    const future = effect('future');
    expect(recurrenceApplied(future, { entityId: future.newSeriesId!, revision: 1, result: 'applied' })).toMatchObject({ id: future.newSeriesId, title: 'Treino', affectedCount: 3, scope: 'future' });
    expect(() => recurrenceApplied(future, { entityId: 'target', revision: 2, result: 'applied' })).toThrow();
  });
});
