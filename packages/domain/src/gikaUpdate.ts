import { z } from 'zod';
import { activityInputSchema, civilDateSchema } from './content.ts';
import { commandEnvelopeSchema, type CommandEnvelope } from './identity.ts';
import { completionDescriptorSchema, completedTaskSchema, completionResolutionSchema } from './gikaCompletion.ts';
export const updateTaskPatchSchema = z.object({ title: activityInputSchema.shape.title }).strict();
export const updateTaskArgsSchema = z.object({ title: activityInputSchema.shape.title, date: civilDateSchema.nullable(), patch: updateTaskPatchSchema }).strict();
export const updateTaskCallSchema = z.object({ name: z.literal('update_task'), args: updateTaskArgsSchema }).strict();
export const updateDescriptorSchema = completionDescriptorSchema.extend({ patch: updateTaskPatchSchema }).strict();
export const updatedTaskSchema = completedTaskSchema;
export const updateResolutionSchema = completionResolutionSchema.extend({ status: z.enum(['clarify','not_found','ambiguous','partial','unchanged','unsupported']) }).strict();
export type UpdateDescriptor = z.infer<typeof updateDescriptorSchema>;
export type UpdatedTask = z.infer<typeof updatedTaskSchema>;
export type UpdateResolution = z.infer<typeof updateResolutionSchema>;
// Narrow payload adaptation only. The existing command remains the sole domain writer.
export function applyTitlePatch(current: Record<string, unknown>, patch: unknown) {
  const input = Object.fromEntries(Object.keys(activityInputSchema.shape).filter(key => Object.hasOwn(current, key)).map(key => [key, current[key]]));
  return activityInputSchema.parse({ ...input, ...updateTaskPatchSchema.parse(patch) });
}
export async function updateEnvelope(descriptor: UpdateDescriptor, request: { requestId: string; text: string }): Promise<CommandEnvelope> {
  const task = updateDescriptorSchema.parse(descriptor);
  const operationId = z.uuid().parse(request.requestId);
  const text = z.string().trim().min(1).max(2000).parse(request.text);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const requestTextHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return commandEnvelopeSchema.parse({ command: 'activity.update', operationId, entityId: task.id,
    expectedRevision: task.revision, payload: task.patch, gikaUpdate: { requestTextHash } });
}
