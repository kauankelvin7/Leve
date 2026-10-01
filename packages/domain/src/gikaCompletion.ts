import { z } from 'zod';
import { activityInputSchema, civilDateSchema } from './content.ts';
import { commandEnvelopeSchema, entityIdSchema, timeZoneSchema, type CommandEnvelope } from './identity.ts';
export const completeTaskArgsSchema = z.object({ title: activityInputSchema.shape.title, date: civilDateSchema.nullable() }).strict();
export const completeTaskCallSchema = z.object({ name: z.literal('complete_task'), args: completeTaskArgsSchema }).strict();
export const completionDescriptorSchema = z.object({ id: entityIdSchema, title: activityInputSchema.shape.title,
  dueDate: civilDateSchema, timeZone: timeZoneSchema, revision: z.number().int().positive() }).strict();
export const completionResultSchema = z.object({ operationId: z.uuid(), entityId: entityIdSchema,
  revision: z.number().int().positive(), serverTime: z.iso.datetime(), result: z.enum(['applied', 'alreadyApplied']) }).strict();
export const completedTaskSchema = completionDescriptorSchema.extend({ result: z.enum(['applied', 'alreadyApplied']) }).strict();
export const completionResolutionSchema = z.object({ status: z.enum(['clarify', 'not_found', 'ambiguous', 'partial', 'already_completed', 'unsupported']),
  candidates: z.array(z.object({ id: entityIdSchema, title: activityInputSchema.shape.title, dueDate: civilDateSchema.nullable(), status: z.enum(['pending', 'completed', 'canceled']) }).strict()).max(50) }).strict();
export type CompletionDescriptor = z.infer<typeof completionDescriptorSchema>;
export type CompletedTask = z.infer<typeof completedTaskSchema>;
export type CompletionResolution = z.infer<typeof completionResolutionSchema>;
export async function completionEnvelope(descriptor: CompletionDescriptor, request: { requestId: string; text: string }): Promise<CommandEnvelope> {
  const task = completionDescriptorSchema.parse(descriptor);
  const operationId = z.uuid().parse(request.requestId);
  const text = z.string().trim().min(1).max(2000).parse(request.text);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const requestTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return commandEnvelopeSchema.parse({ command: 'activity.setStatus', operationId, entityId: task.id,
    expectedRevision: task.revision, payload: { status: 'completed' }, gikaCompletion: { requestTextHash } });
}
