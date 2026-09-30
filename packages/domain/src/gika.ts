import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { activityInputSchema, civilDateSchema } from './content.ts';
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
  z.object({ text: z.string().trim().min(1).max(1000), simulated: z.literal(false), reads: z.array(readResultSchema).max(3) }).strict(),
]);
export type GikaRequest = z.infer<typeof gikaRequestSchema>;
export type GikaResponse = z.infer<typeof gikaResponseSchema>;
export type ReadCall = z.infer<typeof readCallSchema>;
export type ReadResult = z.infer<typeof readResultSchema>;
export type ReadItem = z.infer<typeof readItemSchema>;
