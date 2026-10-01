import { z } from 'zod';
import { civilDateSchema, civilTimeSchema } from './content.ts';
import { rescheduleDescriptorSchema, type RescheduleDescriptor } from './gikaReschedule.ts';

const momentSchema = z.object({ dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable() }).strict();
export const confirmationPolicySchema = z.object({ kind: z.literal('confirm'), risk: z.enum(['low', 'medium', 'high']), reason: z.literal('RESCHEDULE_PREVIEW_REQUIRED') }).strict();
export const confirmationPreviewSchema = z.object({
  policy: confirmationPolicySchema,
  // Closed executable registry. Adding an action requires its own schema/domain adapter and gate.
  action: z.object({ kind: z.literal('reschedule_task'), task: rescheduleDescriptorSchema }).strict(),
  summary: z.object({ before: momentSchema, after: momentSchema, changedFields: z.array(z.enum(['dueDate', 'dueTime'])).min(1).max(2) }).strict(),
}).strict().superRefine((preview, context) => {
  const expected = rescheduleSummary(preview.action.task);
  if (JSON.stringify(preview.summary) !== JSON.stringify(expected)) context.addIssue({ code: 'custom', message: 'Prévia inválida.' });
});
export const gikaConfirmationSchema = confirmationPreviewSchema.safeExtend({ token: z.string().regex(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/).max(8192) }).strict();
export type ConfirmationPreview = z.infer<typeof confirmationPreviewSchema>;
export type GikaConfirmation = z.infer<typeof gikaConfirmationSchema>;
export type ConfirmationState = 'awaiting_confirmation' | 'confirming' | 'confirmed' | 'cancelled' | 'conflict' | 'failed';
export function rescheduleSummary(task: RescheduleDescriptor) {
  const before = { dueDate: task.dueDate!, dueTime: task.dueTime };
  const after = { dueDate: task.patch.dueDate, dueTime: task.patch.dueTime ?? task.dueTime };
  const changedFields: ('dueDate' | 'dueTime')[] = [];
  if (before.dueDate !== after.dueDate) changedFields.push('dueDate');
  if (before.dueTime !== after.dueTime) changedFields.push('dueTime');
  return { before, after, changedFields };
}
export function reschedulePreview(task: RescheduleDescriptor, policy: unknown): ConfirmationPreview {
  return confirmationPreviewSchema.parse({ policy, action: { kind: 'reschedule_task', task }, summary: rescheduleSummary(task) });
}
