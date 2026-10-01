import { z } from 'zod';
import { activityInputSchema, civilDateSchema, moveScheduleToDate, recurrenceDatesThrough, recurrenceRuleSchema, type ActivityInput } from '../../packages/domain/src/content.ts';
import { recurrenceSnapshotSchema, GIKA_RECURRENCE_FUTURE_LIMIT, type RecurrenceEffect, type RecurrenceSnapshot } from '../../packages/domain/src/gikaRecurrence.ts';
import { applyTitlePatch } from '../../packages/domain/src/gikaUpdate.ts';
import { applyReschedulePatch } from '../../packages/domain/src/gikaReschedule.ts';
import { hashCanonicalValue } from '../hash.ts';
import { AppError } from '../errors.ts';

export type RecurrenceMember = { id: string; data: Record<string, unknown> };
const seriesSchema = z.object({ activity: activityInputSchema, recurrence: recurrenceRuleSchema, revision: z.number().int().positive(), schemaVersion: z.literal(1), state: z.enum(['active', 'completed', 'split']), materializedCount: z.number().int().positive(), materializedThrough: civilDateSchema });
const targetSchema = z.object({ kind: z.literal('task'), status: z.enum(['pending', 'completed', 'canceled']), revision: z.number().int().positive(), schemaVersion: z.literal(1), deletedAt: z.null(), seriesId: z.string().min(1), occurrenceKey: civilDateSchema });
const conflict = () => new AppError(409, 'REVISION_CONFLICT', 'Essa rotina mudou. Faça o pedido novamente.');
export function recurrenceActivity(data: Record<string, unknown>): ActivityInput {
  return activityInputSchema.parse(Object.fromEntries(Object.keys(activityInputSchema.shape).filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]])));
}

/** Pure inspection shared by read projection and the existing transactional command writer. */
export function inspectRecurrence(seriesId: string, targetId: string, seriesData: Record<string, unknown>, targetData: Record<string, unknown>, future?: RecurrenceMember[]): RecurrenceSnapshot | null {
  const series = seriesSchema.safeParse(seriesData), target = targetSchema.safeParse(targetData);
  if (!series.success || !target.success || target.data.seriesId !== seriesId || seriesData.deletedAt != null) return null;
  let activity: ActivityInput;
  try { activity = recurrenceActivity(targetData); } catch { return null; }
  if (activity.schedule.type !== 'task' || !activity.schedule.dueDate || series.data.activity.schedule.type !== 'task') return null;
  const bounded = future !== undefined && future.length <= GIKA_RECURRENCE_FUTURE_LIMIT;
  const members = bounded ? [...future].sort((left, right) => left.id.localeCompare(right.id)) : [];
  let futureAllowed = bounded && series.data.state === 'active' && members.length >= 2 && members.some(member => member.id === targetId && hashCanonicalValue(member.data) === hashCanonicalValue(targetData));
  for (const member of members) {
    const parsed = targetSchema.safeParse(member.data);
    if (!parsed.success || parsed.data.seriesId !== seriesId || parsed.data.occurrenceKey < target.data.occurrenceKey || parsed.data.revision !== 1 || parsed.data.status !== 'pending') { futureAllowed = false; continue; }
    try {
      const expected = activityInputSchema.parse({ ...series.data.activity, schedule: moveScheduleToDate(series.data.activity.schedule, parsed.data.occurrenceKey) });
      if (hashCanonicalValue(recurrenceActivity(member.data)) !== hashCanonicalValue(expected)) futureAllowed = false;
    } catch { futureAllowed = false; }
  }
  // Reuse the recurrence generator, bounded by the conventional activity stock limit.
  // Missing/purged materialized members must not be silently counted as past by split.
  if (futureAllowed) {
    const first = series.data.activity.schedule.dueDate;
    if (!first || series.data.materializedCount > 5000) futureAllowed = false;
    else try {
      const materialized = recurrenceDatesThrough(first, series.data.recurrence, series.data.materializedThrough, series.data.materializedCount);
      const expectedKeys = materialized.filter(date => date >= target.data.occurrenceKey).sort();
      const actualKeys = members.map(member => String(member.data.occurrenceKey)).sort();
      if (materialized.length !== series.data.materializedCount || hashCanonicalValue(expectedKeys) !== hashCanonicalValue(actualKeys)) futureAllowed = false;
    } catch { futureAllowed = false; }
  }
  return recurrenceSnapshotSchema.parse({ seriesId, occurrenceKey: target.data.occurrenceKey, seriesHash: hashCanonicalValue(seriesData), targetHash: hashCanonicalValue(targetData), futureHash: bounded ? hashCanonicalValue(members.map(member => ({ id: member.id, hash: hashCanonicalValue(member.data) }))) : null, futureCount: bounded ? members.length : 0, futureAllowed });
}

export function assertRecurrenceSnapshot(effect: RecurrenceEffect, seriesData: Record<string, unknown>, targetData: Record<string, unknown>, future?: RecurrenceMember[]) {
  const actual = inspectRecurrence(effect.recurrence.seriesId, effect.task.id, seriesData, targetData, future);
  const expected = effect.recurrence;
  if (!actual || actual.seriesHash !== expected.seriesHash || actual.targetHash !== expected.targetHash || actual.occurrenceKey !== expected.occurrenceKey) throw conflict();
  if (effect.scope === 'future' && (!actual.futureAllowed || actual.futureCount !== expected.futureCount || actual.futureHash !== expected.futureHash)) throw conflict();
  const activity = recurrenceActivity(targetData);
  if (activity.schedule.type !== 'task' || activity.title !== effect.task.title || activity.schedule.dueDate !== effect.task.dueDate || activity.schedule.dueTime !== effect.task.dueTime || activity.schedule.timeZone !== effect.task.timeZone || targetData.revision !== effect.task.revision) throw conflict();
}
export function applyRecurrencePatch(current: Record<string, unknown>, effect: RecurrenceEffect): ActivityInput {
  if (effect.operation === 'update') return applyTitlePatch(current, effect.patch);
  if (effect.operation === 'reschedule') return applyReschedulePatch(current, effect.patch);
  return recurrenceActivity(current);
}
