import { rescheduleTaskCallSchema,rescheduleDescriptorSchema,rescheduleResolutionSchema } from './gikaReschedule.ts';
import { updateTaskCallSchema, updateDescriptorSchema, updatedTaskSchema, updateResolutionSchema } from './gikaUpdate.ts';
import { completeTaskCallSchema, completionDescriptorSchema, completedTaskSchema, completionResolutionSchema } from './gikaCompletion.ts';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { activityInputSchema, civilDateSchema, civilTimeSchema } from './content.ts';
import { entityIdSchema, timeZoneSchema } from './identity.ts';
export const GIKA_MAX_INPUT = 2000;
export const GIKA_MAX_MESSAGES = 40;
export const gikaRequestSchema = z.object({ requestId: z.uuid(), text: z.string().trim().min(1).max(GIKA_MAX_INPUT) }).strict();
export const readCallSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('get_today'), args: z.object({}).strict() }).strict(),
  z.object({ name: z.literal('get_day'), args: z.object({ date: civilDateSchema }).strict() }).strict(),
  z.object({ name: z.literal('get_week'), args: z.object({ date: civilDateSchema }).strict() }).strict(),
]);
export const readItemSchema = z.object({
  id: entityIdSchema, revision: z.number().int().positive(), title: activityInputSchema.shape.title,
  kind: z.enum(['task', 'event']), status: z.enum(['pending', 'completed', 'canceled']),
  schedule: activityInputSchema.shape.schedule, seriesId: entityIdSchema.nullable(), occurrenceKey: civilDateSchema.nullable(),
}).strict().superRefine((item, context) => {
  const activity = activityInputSchema.safeParse({ title: item.title, descriptionPlain: '', categoryId: null, reminderSpecs: [], schedule: item.schedule });
  if (!activity.success || item.kind !== item.schedule.type) context.addIssue({ code: 'custom', message: 'Atividade inválida.' });
});
export const readResultSchema = z.object({
  startDate: civilDateSchema, endDate: civilDateSchema, timeZone: timeZoneSchema,
  partial: z.boolean(), cached: z.literal(false), items: z.array(readItemSchema).max(50),
}).strict().refine(result => {
  const days = Temporal.PlainDate.from(result.startDate).until(Temporal.PlainDate.from(result.endDate)).days;
  return days >= 0 && days < 7 && new Set(result.items.map(item => item.id)).size === result.items.length;
});
export const gikaResponseSchema = z.discriminatedUnion('simulated', [
  z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(true), preview: z.literal('organize-demo').optional() }).strict(),
  z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(false), reads: z.array(readResultSchema).max(3), createdTask: z.lazy(() => createdTaskSchema).optional(), completedTask: completedTaskSchema.optional(), completionResolution: completionResolutionSchema.optional(), updatedTask: updatedTaskSchema.optional(), updateResolution: updateResolutionSchema.optional(), rescheduleTask: rescheduleDescriptorSchema.optional(), rescheduleResolution: rescheduleResolutionSchema.optional() }).strict().refine(response => [response.createdTask, response.completedTask, response.completionResolution, response.updatedTask, response.updateResolution, response.rescheduleTask, response.rescheduleResolution].filter(Boolean).length <= 1 && (!(response.createdTask || response.completedTask || response.completionResolution || response.updatedTask || response.updateResolution || response.rescheduleTask || response.rescheduleResolution) || response.reads.length === 0)),
]);
export type GikaRequest = z.infer<typeof gikaRequestSchema>;
export type GikaResponse = z.infer<typeof gikaResponseSchema>;
export type ReadCall = z.infer<typeof readCallSchema>;
export type ReadResult = z.infer<typeof readResultSchema>;
export type ReadItem = z.infer<typeof readItemSchema>;

export const createTaskArgsSchema = z.object({
  title: activityInputSchema.shape.title, dueDate: civilDateSchema.nullable(),
  dueTime: civilTimeSchema.nullable(),
}).strict();
export const createTaskCallSchema = z.object({ name: z.literal('create_task'), args: createTaskArgsSchema }).strict();
export const toolCallSchema = z.union([readCallSchema, createTaskCallSchema, completeTaskCallSchema, updateTaskCallSchema, rescheduleTaskCallSchema]);
export const createTaskDescriptorSchema = createTaskArgsSchema.extend({ timeZone: timeZoneSchema }).strict().superRefine((task, context) => {
  if (!activityInputSchema.safeParse(taskActivityInput(task)).success) context.addIssue({ code: 'custom', message: 'Tarefa inválida.' });
});
export function taskActivityInput(task: { title: string; dueDate: string | null; dueTime: string | null; timeZone: string }) {
  return { title: task.title, descriptionPlain: '', categoryId: null, colorHex: null, estimatedMinutes: null,
    schedule: { type: 'task' as const, dueDate: task.dueDate, dueTime: task.dueTime, timeZone: task.timeZone, disambiguation: 'reject' as const }, reminderSpecs: [] };
}
export const commandCreationResultSchema = z.object({ operationId: z.uuid(), entityId: entityIdSchema,
  revision: z.literal(1), serverTime: z.iso.datetime(), result: z.enum(['applied', 'alreadyApplied']) }).strict();
export const createdTaskSchema = createTaskDescriptorSchema.safeExtend({ id: entityIdSchema, revision: z.literal(1), result: z.enum(['applied', 'alreadyApplied']) }).strict();
export const gikaInterpretationSchema = z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(false),
  reads: z.array(readResultSchema).max(3), createTask: createTaskDescriptorSchema.optional(), completeTask: completionDescriptorSchema.optional(), completionResolution: completionResolutionSchema.optional(), updateTask: updateDescriptorSchema.optional(), updateResolution: updateResolutionSchema.optional(), rescheduleTask: rescheduleDescriptorSchema.optional(), rescheduleResolution: rescheduleResolutionSchema.optional() }).strict().refine(response => [response.createTask, response.completeTask, response.completionResolution, response.updateTask, response.updateResolution, response.rescheduleTask, response.rescheduleResolution].filter(Boolean).length <= 1 && (!(response.createTask || response.completeTask || response.completionResolution || response.updateTask || response.updateResolution || response.rescheduleTask || response.rescheduleResolution) || response.reads.length === 0));
export type CreateTaskDescriptor = z.infer<typeof createTaskDescriptorSchema>;
export type CreatedTask = z.infer<typeof createdTaskSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
