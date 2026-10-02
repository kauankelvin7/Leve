import { scopedIntent } from './scopeIntent.ts';
import { hashCanonicalValue } from '../hash.ts';
import { scheduleInstants } from '../../packages/domain/src/content.ts';
import { organizationCallSchema, organizationPreviewSchema, type OrganizationPreview } from '../../packages/domain/src/gikaOrganization.ts';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import type { ModelContext, ModelInput } from './model.ts';
import { GikaFault } from './model.ts';

/** Intent selects a bounded software read, never a model-selected query. */
export function organizationPeriod(text: string): 'day' | 'week' | null {
  const source = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (!/\b(?:organiza|organize|organizar|organizaria|reorganiza|reorganize|reorganizar)\b/u.test(source)) return null;
  if (/\bsemana\b/u.test(source)) return 'week';
  return /\b(?:dia|hoje)\b/u.test(source) ? 'day' : null;
}
export function organizationCandidates(read: ReadResult, today: string) {
  return read.items.filter(item => item.kind === 'task' && item.status === 'pending' && item.schedule.type === 'task' && item.schedule.dueDate && item.schedule.dueDate >= today).sort((a,b) => a.id.localeCompare(b.id));
}
export function planningContext(read: ReadResult, context: ModelContext): ModelInput['planning'] {
  const candidates = organizationCandidates(read, context.today);
  if (read.partial || read.items.length >= 50 || candidates.length > 5) throw new GikaFault('GIKA_POLICY');
  return { startDate: read.startDate, endDate: read.endDate, tasks: candidates.map((item,ref) => {
    if (item.schedule.type !== 'task' || !item.schedule.dueDate) throw new GikaFault('GIKA_POLICY');
    return { ref, title: item.title, status: item.status, dueDate: item.schedule.dueDate, dueTime: item.schedule.dueTime, recurring: Boolean(item.seriesId || item.occurrenceKey) };
  }) };
}
export function validateOrganization(call: unknown, read: ReadResult, fresh: ReadResult, context: ModelContext, period: 'day' | 'week', text = ''): OrganizationPreview {
  const parsed = organizationCallSchema.safeParse(call);
  if (!parsed.success) throw new GikaFault('GIKA_MALFORMED_CALL');
  planningContext(read, context); planningContext(fresh, context);
  // Full bounded snapshot comparison includes revisions/recurrence; never refresh stale preconditions.
  if (hashCanonicalValue({...read,items:[...read.items].sort((a,b)=>a.id.localeCompare(b.id))}) !== hashCanonicalValue({...fresh,items:[...fresh.items].sort((a,b)=>a.id.localeCompare(b.id))})) throw new GikaFault('GIKA_POLICY');
  const candidates = organizationCandidates(read, context.today);
  if (parsed.data.args.items.length !== candidates.length || new Set(parsed.data.args.items.map(item => item.ref)).size !== candidates.length) throw new GikaFault('GIKA_POLICY');
  const items = parsed.data.args.items.map(proposal => {
    const target = candidates[proposal.ref];
    if (!target || target.schedule.type !== 'task' || !target.schedule.dueDate) throw new GikaFault('GIKA_POLICY');
    if (proposal.dueDate < context.today || proposal.dueDate > read.endDate) throw new GikaFault('GIKA_POLICY');
    if ((target.seriesId || target.occurrenceKey) && proposal.action === 'move' && scopedIntent(text,{}).scope !== 'occurrence') throw new GikaFault('GIKA_POLICY');
    const before = {dueDate:target.schedule.dueDate,dueTime:target.schedule.dueTime}, after = {dueDate:proposal.dueDate,dueTime:proposal.dueTime};
    // The planner cannot invent a time for an untimed task. Explicit suggestions preserve time in this bounded first contract.
    if (after.dueTime !== before.dueTime || (proposal.action === 'keep') !== (JSON.stringify(before) === JSON.stringify(after))) throw new GikaFault('GIKA_POLICY');
    try { scheduleInstants({...target.schedule,...after}); } catch { throw new GikaFault('GIKA_POLICY'); }
    return {id:target.id,title:target.title,revision:target.revision,timeZone:target.schedule.timeZone,before,after,action:proposal.action,recurring:Boolean(target.seriesId || target.occurrenceKey)};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return organizationPreviewSchema.parse({period,startDate:read.startDate,endDate:read.endDate,items});
}
