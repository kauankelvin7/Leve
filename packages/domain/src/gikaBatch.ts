import { organizationPreviewSchema } from './gikaOrganization.ts';
import { z } from 'zod';
import { civilDateSchema, civilTimeSchema } from './content.ts';
import { commandEnvelopeSchema, entityIdSchema, timeZoneSchema, type CommandEnvelope } from './identity.ts';
import { recurrenceSnapshotSchema } from './gikaRecurrence.ts';
import { rescheduleTaskPatchSchema } from './gikaReschedule.ts';
export const GIKA_BATCH_LIMIT = 5;
const patchSchema = z.union([z.object({ status: z.literal('completed') }).strict(), rescheduleTaskPatchSchema]);
export const batchItemSchema = z.object({ operationId: z.uuid(), id: entityIdSchema, title: z.string().trim().min(1).max(120), revision: z.number().int().positive(), timeZone: timeZoneSchema, before: z.object({ dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable() }).strict(), patch: patchSchema, scope: z.enum(['none', 'occurrence']), recurrence: recurrenceSnapshotSchema.optional() }).strict().refine(item => (item.scope === 'occurrence') === Boolean(item.recurrence));
export const batchPlanSchema = z.object({ action: z.enum(['complete', 'reschedule']), sourceDate: civilDateSchema, organization: organizationPreviewSchema.optional(), items: z.array(batchItemSchema).min(1).max(GIKA_BATCH_LIMIT) }).strict().superRefine((plan, context) => {
  if (plan.organization) {
    const moves = plan.organization.items.filter(item => item.action === 'move');
    if (plan.action !== 'reschedule' || plan.organization.period !== 'day' || plan.organization.startDate !== plan.sourceDate || moves.length !== plan.items.length || moves.some((move,index) => {
      const item = plan.items[index];
      return !item || move.id !== item.id || move.revision !== item.revision || move.title !== item.title || move.timeZone !== item.timeZone || JSON.stringify(move.before) !== JSON.stringify(item.before) || !('dueDate' in item.patch) || move.after.dueDate !== item.patch.dueDate || move.after.dueTime !== (item.patch.dueTime ?? item.before.dueTime) || move.recurring !== (item.scope === 'occurrence');
    })) context.addIssue({code:'custom',message:'Confira a proposta dessa prévia.'});
  }
  if (new Set(plan.items.map(item => item.id)).size !== plan.items.length || new Set(plan.items.map(item => item.operationId)).size !== plan.items.length || plan.items.some(item => item.before.dueDate !== plan.sourceDate || (plan.action === 'complete' ? !('status' in item.patch) : !('dueDate' in item.patch)))) context.addIssue({ code: 'custom', message: 'Confira as tarefas dessa prévia.' });
});
export const batchConfirmationSchema = z.object({ plan: batchPlanSchema, token: z.string().regex(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/).max(16384) }).strict();
export const gikaBatchConfirmationSchema = batchConfirmationSchema;
export type BatchItem = z.infer<typeof batchItemSchema>;
export type BatchPlan = z.infer<typeof batchPlanSchema>;
export type BatchConfirmation = z.infer<typeof batchConfirmationSchema>;
export const batchResultItemSchema = z.object({ id: entityIdSchema, title: z.string().min(1).max(120), status: z.enum(['applied', 'alreadyApplied', 'conflict', 'failed', 'pending', 'unknown']), revision: z.number().int().positive().optional() }).strict();
export const batchResultSchema = z.object({ requested: z.number().int().min(1).max(5), applied: z.number().int().nonnegative(), alreadyApplied: z.number().int().nonnegative(), conflicts: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), pending: z.number().int().nonnegative(), unknown: z.number().int().nonnegative(), items: z.array(batchResultItemSchema).min(1).max(5) }).strict().refine(result => result.requested === result.items.length && ['applied', 'alreadyApplied', 'failed', 'pending', 'unknown'].every(key => result[key as 'applied'] === result.items.filter(item => item.status === key).length) && result.conflicts === result.items.filter(item => item.status === 'conflict').length);
export type BatchResult = z.infer<typeof batchResultSchema>;
export function batchResult(items: BatchResult['items']): BatchResult { return batchResultSchema.parse({ requested: items.length, items, applied: items.filter(item => item.status === 'applied').length, alreadyApplied: items.filter(item => item.status === 'alreadyApplied').length, conflicts: items.filter(item => item.status === 'conflict').length, failed: items.filter(item => item.status === 'failed').length, pending: items.filter(item => item.status === 'pending').length, unknown: items.filter(item => item.status === 'unknown').length }); }
export function batchCommandFields(plan: BatchPlan, index: number) { const item = plan.items[index]; if (!item) throw new Error('Item indisponível.'); return { command: plan.action === 'complete' ? 'activity.setStatus' : 'activity.update', operationId: item.operationId, entityId: item.id, expectedRevision: item.revision, payload: item.patch }; }
export async function batchOperationId(uid: string, requestId: string, index: number): Promise<string> {
  entityIdSchema.parse(uid); z.uuid().parse(requestId); z.number().int().min(0).max(4).parse(index);
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['leve:gika-batch:v1', uid, requestId, index])))); bytes[6] = (bytes[6]! & 15) | 80; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join(''); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function batchEnvelope(confirmation: BatchConfirmation, request: { requestId: string; text: string }, index: number): Promise<CommandEnvelope> { const parsed = batchConfirmationSchema.parse(confirmation); const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.text.trim()))); return commandEnvelopeSchema.parse({ ...batchCommandFields(parsed.plan,index), gikaBatch: { requestId: z.uuid().parse(request.requestId), requestTextHash: Array.from(digest, byte => byte.toString(16).padStart(2,'0')).join(''), index, confirmationToken: parsed.token } }); }
const args = { sourceDate: civilDateSchema, title: z.string().trim().min(1).max(120).nullable(), excludeTitles: z.array(z.string().trim().min(1).max(120)).max(5), scope: z.enum(['occurrence', 'future', 'all']).nullable() };
export const batchCallSchema = z.discriminatedUnion('name', [z.object({ name: z.literal('batch_complete'), args: z.object(args).strict() }).strict(), z.object({ name: z.literal('batch_reschedule'), args: z.object({ ...args, dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable() }).strict() }).strict()]);
export type BatchCall = z.infer<typeof batchCallSchema>;
