import { z } from 'zod';
import { civilDateSchema, civilTimeSchema } from './content.ts';
import { entityIdSchema, timeZoneSchema } from './identity.ts';

const momentSchema = z.object({ dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable() }).strict();
export const organizationCallSchema = z.object({ name: z.literal('propose_organization'), args: z.object({
  items: z.array(z.object({ ref: z.number().int().min(0).max(4), action: z.enum(['keep', 'move']), dueDate: civilDateSchema, dueTime: civilTimeSchema.nullable() }).strict()).max(5),
}).strict() }).strict();
export const organizationPreviewSchema = z.object({
  period: z.enum(['day', 'week']), startDate: civilDateSchema, endDate: civilDateSchema,
  items: z.array(z.object({ id: entityIdSchema, title: z.string().trim().min(1).max(120), revision: z.number().int().positive(), timeZone: timeZoneSchema,
    before: momentSchema, after: momentSchema, action: z.enum(['keep', 'move']), recurring: z.boolean(),
  }).strict()).max(5),
}).strict().refine(plan => new Set(plan.items.map(item => item.id)).size === plan.items.length && plan.items.every(item => (item.action === 'keep') === (JSON.stringify(item.before) === JSON.stringify(item.after))));
export type OrganizationPreview = z.infer<typeof organizationPreviewSchema>;
export type OrganizationCall = z.infer<typeof organizationCallSchema>;
