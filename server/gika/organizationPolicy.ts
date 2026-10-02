import { batchPlanSchema, batchOperationId, type BatchPlan } from '../../packages/domain/src/gikaBatch.ts';
import { classifyBatchAction } from './batchPolicy.ts';
import type { ReadRepository } from './reads.ts';
import type { GikaRequest } from '../../packages/domain/src/gika.ts';
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
    // A suggested time is visible and sealed; clearing time is not supported by the existing patch.
    if ((after.dueTime === null && before.dueTime !== null) || (proposal.action === 'keep') !== (JSON.stringify(before) === JSON.stringify(after))) throw new GikaFault('GIKA_POLICY');
    try { scheduleInstants({...target.schedule,...after}); } catch { throw new GikaFault('GIKA_POLICY'); }
    return {id:target.id,title:target.title,revision:target.revision,timeZone:target.schedule.timeZone,before,after,action:proposal.action,recurring:Boolean(target.seriesId || target.occurrenceKey)};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return organizationPreviewSchema.parse({period,startDate:read.startDate,endDate:read.endDate,items});
}

/** Convert validated suggestions into the existing sealed, sequential batch contract. */
export async function organizationBatch(preview: OrganizationPreview, repository: ReadRepository, uid: string, request: GikaRequest): Promise<BatchPlan | null> {
  const changes=preview.items.filter(item=>item.action==='move');
  if(!changes.length)return null;
  const items: BatchPlan['items']=[];
  for(const target of changes){
    const recurrence=target.recurring ? await repository.inspectRecurrence?.(uid,{id:target.id,title:target.title,revision:target.revision,dueDate:target.before.dueDate,dueTime:target.before.dueTime,timeZone:target.timeZone}) : undefined;
    if(target.recurring && !recurrence)throw new GikaFault('GIKA_POLICY');
    items.push({operationId:await batchOperationId(uid,request.requestId,items.length),id:target.id,title:target.title,revision:target.revision,timeZone:target.timeZone,before:target.before,patch:{dueDate:target.after.dueDate,...(target.after.dueTime!==target.before.dueTime&&target.after.dueTime!==null?{dueTime:target.after.dueTime}:{})},scope:target.recurring?'occurrence':'none',...(recurrence?{recurrence}:{})});
  }
  if(classifyBatchAction({action:'reschedule',count:items.length,complete:true,recurrenceVerified:items.every(item=>item.scope==='none'||Boolean(item.recurrence))})!=='confirm')throw new GikaFault('GIKA_POLICY');
  return batchPlanSchema.parse({action:'reschedule',sourceDate:preview.startDate,organization:preview,items});
}
