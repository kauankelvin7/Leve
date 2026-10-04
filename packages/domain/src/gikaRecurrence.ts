import { z } from 'zod';
import { civilDateSchema, civilTimeSchema } from './content.ts';
import { completionDescriptorSchema } from './gikaCompletion.ts';
import { updateTaskPatchSchema } from './gikaUpdate.ts';
import { rescheduleTaskPatchSchema } from './gikaReschedule.ts';
import { commandEnvelopeSchema, entityIdSchema, type CommandEnvelope } from './identity.ts';

export const GIKA_RECURRENCE_FUTURE_LIMIT = 50;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const recurrenceTaskSchema = completionDescriptorSchema.extend({ dueTime: civilTimeSchema.nullable() }).strict();
export const recurrenceSnapshotSchema = z.object({
  seriesId: entityIdSchema, occurrenceKey: civilDateSchema,
  seriesHash: hash, targetHash: hash, futureHash: hash.nullable(),
  futureCount: z.number().int().min(0).max(GIKA_RECURRENCE_FUTURE_LIMIT), futureAllowed: z.boolean(),
}).strict();
const common = { task: recurrenceTaskSchema, recurrence: recurrenceSnapshotSchema };
const operations = {
  complete: { ...common, operation: z.literal('complete'), patch: z.object({ status: z.literal('completed') }).strict() },
  update: { ...common, operation: z.literal('update'), patch: updateTaskPatchSchema },
  reschedule: { ...common, operation: z.literal('reschedule'), patch: rescheduleTaskPatchSchema },
};
export const recurrenceProposalSchema = z.discriminatedUnion('operation', [
  z.object(operations.complete).strict(), z.object(operations.update).strict(), z.object(operations.reschedule).strict(),
]);
export const recurrenceEffectSchema = z.discriminatedUnion('operation', [
  z.object({ ...operations.complete, scope: z.literal('occurrence'), newSeriesId: z.null() }).strict(),
  z.object({ ...operations.update, scope: z.enum(['occurrence', 'future']), newSeriesId: z.uuid().nullable() }).strict(),
  z.object({ ...operations.reschedule, scope: z.enum(['occurrence', 'future']), newSeriesId: z.uuid().nullable() }).strict(),
]).superRefine((effect, context) => {
  if (effect.scope === 'future' ? !effect.newSeriesId || !effect.recurrence.futureAllowed || !effect.recurrence.futureHash || effect.recurrence.futureCount < 2 : effect.newSeriesId !== null) {
    context.addIssue({ code: 'custom', message: 'Escolha um escopo disponível para essa rotina.' });
  }
});
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/).max(8192);
export const recurrenceChoiceSchema = z.object({ proposal: recurrenceProposalSchema, options: z.array(z.enum(['occurrence', 'future'])).min(1).max(2), token: tokenSchema }).strict().superRefine((choice, context) => {
  if (!choice.options.includes('occurrence') || new Set(choice.options).size !== choice.options.length || (choice.options.includes('future') && (choice.proposal.operation === 'complete' || !choice.proposal.recurrence.futureAllowed))) context.addIssue({ code: 'custom', message: 'Escolha um escopo disponível para essa rotina.' });
});
export const recurrenceConfirmationSchema = z.object({ policy: z.object({ kind: z.literal('confirm'), risk: z.enum(['medium', 'high']), reason: z.literal('RECURRENCE_PREVIEW_REQUIRED') }).strict(), effect: recurrenceEffectSchema, token: tokenSchema }).strict();
export type RecurrenceTask = z.infer<typeof recurrenceTaskSchema>;
export type RecurrenceSnapshot = z.infer<typeof recurrenceSnapshotSchema>;
export type RecurrenceEffect = z.infer<typeof recurrenceEffectSchema>;
export type RecurrenceProposal = z.infer<typeof recurrenceProposalSchema>;
export type RecurrenceChoice = z.infer<typeof recurrenceChoiceSchema>;
export type RecurrenceConfirmation = z.infer<typeof recurrenceConfirmationSchema>;
export const recurrenceAppliedSchema = z.object({ operation: z.enum(['complete', 'update', 'reschedule']), scope: z.enum(['occurrence', 'future']), id: entityIdSchema, title: recurrenceTaskSchema.shape.title, dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable(), timeZone: recurrenceTaskSchema.shape.timeZone, revision: z.number().int().positive(), result: z.enum(['applied', 'alreadyApplied']), affectedCount: z.number().int().positive().max(GIKA_RECURRENCE_FUTURE_LIMIT) }).strict();
export type RecurrenceApplied = z.infer<typeof recurrenceAppliedSchema>;
export function recurrenceApplied(effect: RecurrenceEffect, ack: { entityId: string; revision: number; result: 'applied' | 'alreadyApplied' }): RecurrenceApplied {
  const id = effect.scope === 'future' ? effect.newSeriesId! : effect.task.id;
  if (ack.entityId !== id || ack.revision !== (effect.scope === 'future' ? 1 : effect.task.revision + 1)) throw new Error('Confirmação inválida.');
  return recurrenceAppliedSchema.parse({ operation: effect.operation, scope: effect.scope, id, title: effect.operation === 'update' ? effect.patch.title : effect.task.title, dueDate: effect.operation === 'reschedule' ? effect.patch.dueDate : effect.task.dueDate, dueTime: effect.operation === 'reschedule' ? effect.patch.dueTime ?? effect.task.dueTime : effect.task.dueTime, timeZone: effect.task.timeZone, revision: ack.revision, result: ack.result, affectedCount: effect.scope === 'future' ? effect.recurrence.futureCount : 1 });
}

/** The existing command API remains the only mutation path. Models never select these fields. */
export function recurrenceCommandFields(value: RecurrenceEffect) {
  const effect = recurrenceEffectSchema.parse(value);
  return {
    command: effect.scope === 'future' ? 'activity.updateFuture' : effect.operation === 'complete' ? 'activity.setStatus' : 'activity.update',
    entityId: effect.task.id, expectedRevision: effect.task.revision,
    payload: effect.scope === 'future' ? { patch: effect.patch, newSeriesId: effect.newSeriesId } : effect.patch,
  };
}
export async function recurrenceEnvelope(effect: RecurrenceEffect, request: { requestId: string; text: string }, confirmationToken: string): Promise<CommandEnvelope> {
  const operationId = z.uuid().parse(request.requestId);
  const text = z.string().trim().min(1).max(2000).parse(request.text);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const requestTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return commandEnvelopeSchema.parse({ ...recurrenceCommandFields(effect), operationId, gikaRecurrence: { requestTextHash, confirmationToken } });
}
