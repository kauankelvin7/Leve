import { createShoppingListCallSchema, createShoppingListDescriptorSchema, createdShoppingListSchema, shoppingListsCallSchema, shoppingListsResultSchema } from './gikaShopping.ts';
import { organizationResolutionSchema, organizationPreviewSchema, organizationCallSchema } from './gikaOrganization.ts';
import { batchCallSchema, batchConfirmationSchema, batchResultSchema } from './gikaBatch.ts';
import { recurrenceChoiceSchema, recurrenceConfirmationSchema, recurrenceAppliedSchema } from './gikaRecurrence.ts';
import { gikaConfirmationSchema } from './gikaConfirmation.ts';
import { rescheduleTaskCallSchema,rescheduleDescriptorSchema,rescheduleResolutionSchema } from './gikaReschedule.ts';
import { updateTaskCallSchema, updateDescriptorSchema, updatedTaskSchema, updateResolutionSchema } from './gikaUpdate.ts';
import { completeTaskCallSchema, completionDescriptorSchema, completedTaskSchema, completionResolutionSchema } from './gikaCompletion.ts';
import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { activityInputSchema, civilDateSchema, civilTimeSchema } from './content.ts';
import { entityIdSchema, timeZoneSchema } from './identity.ts';
export const gikaDomainIntentSchema = z.enum(['SOCIAL', 'GIKA_META', 'AGENDA_QUERY', 'AGENDA_ACTION', 'ORGANIZATION_CONVERSATION', 'OUT_OF_SCOPE']);
export const gikaCurrentActionSchema = z.object({ kind: z.enum(['create_task', 'reschedule_task']), sourceText: z.string().trim().min(1).max(2000), requestExpression: z.string().trim().min(1).max(120), title: z.string().trim().min(1).max(120), dateExpression: z.string().trim().min(1).max(40).nullable(), timeExpression: z.string().trim().min(1).max(60).nullable() }).strict();
export const gikaIntentClassificationSchema = z.object({ intent: gikaDomainIntentSchema, certain: z.boolean(), currentAction: gikaCurrentActionSchema.nullable().optional(), reply: z.string().trim().min(1).max(1000).nullable() }).strict().refine(value => !value.currentAction || (value.certain && value.intent === 'AGENDA_ACTION')).refine(value => (value.certain && ['SOCIAL', 'GIKA_META', 'ORGANIZATION_CONVERSATION'].includes(value.intent)) || value.reply === null);
export const GIKA_MAX_INPUT = 2000;
export const GIKA_MAX_MESSAGES = 120;
export const GIKA_MAX_CONTEXT_TURNS = 12;
export const GIKA_MAX_REQUEST_BYTES = 12 * 1024;
export const conversationTurnSchema = z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(1000) }).strict();
export const gikaRequestSchema = z.object({ requestId: z.uuid(), text: z.string().trim().min(1).max(GIKA_MAX_INPUT), conversation: z.array(conversationTurnSchema).max(GIKA_MAX_CONTEXT_TURNS).optional() }).strict();
export const conversationCallSchema = z.object({ name: z.literal('respond_conversation'), args: z.object({ text: z.string().trim().min(1).max(1000) }).strict() }).strict();
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
  z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(false), intent: z.enum(['conversation', 'agenda_query', 'agenda_action']).optional(), domainIntent: gikaDomainIntentSchema.optional(), reads: z.array(readResultSchema).max(3), createdTask: z.lazy(() => createdTaskSchema).optional(), createdShoppingList: createdShoppingListSchema.optional(), shoppingLists: shoppingListsResultSchema.optional(), completedTask: completedTaskSchema.optional(), completionResolution: completionResolutionSchema.optional(), updatedTask: updatedTaskSchema.optional(), updateResolution: updateResolutionSchema.optional(), rescheduleTask: rescheduleDescriptorSchema.optional(), confirmation: gikaConfirmationSchema.optional(), rescheduleResolution: rescheduleResolutionSchema.optional(), recurrenceChoice: recurrenceChoiceSchema.optional(), organizationResolution: organizationResolutionSchema.optional(), organizationPreview: organizationPreviewSchema.optional(), batchConfirmation: batchConfirmationSchema.optional(), batchResult: batchResultSchema.optional(), recurrenceConfirmation: recurrenceConfirmationSchema.optional(), recurrenceApplied: recurrenceAppliedSchema.optional() }).strict().refine(response => response.intent !== 'conversation' || (response.reads.length === 0 && !Object.keys(response).some(key => !['text', 'intent', 'domainIntent', 'simulated', 'reads'].includes(key)))).refine(response => !response.confirmation || (response.rescheduleTask && JSON.stringify(response.confirmation.action.task) === JSON.stringify(response.rescheduleTask))).refine(response => [response.organizationResolution, response.organizationPreview, response.createdShoppingList, response.shoppingLists, response.createdTask, response.completedTask, response.completionResolution, response.updatedTask, response.updateResolution, response.rescheduleTask, response.rescheduleResolution, response.recurrenceChoice, response.recurrenceConfirmation, response.recurrenceApplied, response.batchConfirmation, response.batchResult].filter(Boolean).length <= 1 && (!(response.organizationResolution || response.organizationPreview || response.createdShoppingList || response.shoppingLists || response.createdTask || response.completedTask || response.completionResolution || response.updatedTask || response.updateResolution || response.rescheduleTask || response.rescheduleResolution || response.recurrenceChoice || response.recurrenceConfirmation || response.recurrenceApplied || response.batchConfirmation || response.batchResult) || response.reads.length === 0)),
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
export const toolCallSchema = z.union([conversationCallSchema, readCallSchema, shoppingListsCallSchema, createShoppingListCallSchema, createTaskCallSchema, completeTaskCallSchema, updateTaskCallSchema, rescheduleTaskCallSchema, batchCallSchema, organizationCallSchema]);
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
export const gikaInterpretationSchema = z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(false), intent: z.enum(['conversation', 'agenda_query', 'agenda_action']).optional(), domainIntent: gikaDomainIntentSchema.optional(),
  reads: z.array(readResultSchema).max(3), createTask: createTaskDescriptorSchema.optional(), createShoppingList: createShoppingListDescriptorSchema.optional(), shoppingLists: shoppingListsResultSchema.optional(), completeTask: completionDescriptorSchema.optional(), completionResolution: completionResolutionSchema.optional(), updateTask: updateDescriptorSchema.optional(), updateResolution: updateResolutionSchema.optional(), rescheduleTask: rescheduleDescriptorSchema.optional(), confirmation: gikaConfirmationSchema.optional(), rescheduleResolution: rescheduleResolutionSchema.optional(), recurrenceChoice: recurrenceChoiceSchema.optional(), organizationResolution: organizationResolutionSchema.optional(), organizationPreview: organizationPreviewSchema.optional(), batchConfirmation: batchConfirmationSchema.optional(), batchResult: batchResultSchema.optional(), recurrenceConfirmation: recurrenceConfirmationSchema.optional() }).strict().refine(response => response.intent !== 'conversation' || (response.reads.length === 0 && !Object.keys(response).some(key => !['text', 'intent', 'domainIntent', 'simulated', 'reads'].includes(key)))).refine(response => !response.confirmation || (response.rescheduleTask && JSON.stringify(response.confirmation.action.task) === JSON.stringify(response.rescheduleTask))).refine(response => [response.organizationResolution, response.organizationPreview, response.createShoppingList, response.shoppingLists, response.createTask, response.completeTask, response.completionResolution, response.updateTask, response.updateResolution, response.rescheduleTask, response.rescheduleResolution, response.recurrenceChoice, response.recurrenceConfirmation, response.batchConfirmation, response.batchResult].filter(Boolean).length <= 1 && (!(response.organizationResolution || response.organizationPreview || response.createShoppingList || response.shoppingLists || response.createTask || response.completeTask || response.completionResolution || response.updateTask || response.updateResolution || response.rescheduleTask || response.rescheduleResolution || response.recurrenceChoice || response.recurrenceConfirmation || response.batchConfirmation || response.batchResult) || response.reads.length === 0));
export type CreateTaskDescriptor = z.infer<typeof createTaskDescriptorSchema>;
export type CreatedTask = z.infer<typeof createdTaskSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
