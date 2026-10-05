import { z } from 'zod';

// Facts are constructed by server software AFTER schema/intent/auth validation.
// This classifier is not an authorization service and no decision is an ack.
export const gikaPolicyDecisionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('allow') }).strict(),
  z.object({ kind: z.literal('clarify'), reason: z.enum(['MISSING_REQUIRED_DATA', 'AMBIGUOUS_TARGET', 'TARGET_NOT_FOUND', 'RECURRENCE_SCOPE_REQUIRED']) }).strict(),
  z.object({ kind: z.literal('confirm'), risk: z.enum(['low', 'medium', 'high']), reason: z.enum(['RESCHEDULE_PREVIEW_REQUIRED', 'RECURRENCE_PREVIEW_REQUIRED']) }).strict(),
  z.object({ kind: z.literal('deny'), reason: z.enum(['UNKNOWN_ACTION', 'INVALID_FACTS', 'INVALID_PAYLOAD', 'AUTH_REQUIRED', 'AUTH_CHANGED', 'INCOMPLETE_RESOLUTION', 'BULK_NOT_SUPPORTED', 'RECURRENCE_NOT_SUPPORTED', 'DESTRUCTIVE_NOT_SUPPORTED', 'FIELD_NOT_ALLOWED', 'UNSUPPORTED_TARGET', 'NO_CHANGE_REQUIRED']) }).strict(),
]);
export type GikaPolicyDecision = z.infer<typeof gikaPolicyDecisionSchema>;
const factsSchema = z.object({
  action: z.string().min(1).max(80), effect: z.enum(['create', 'complete', 'rename', 'reschedule', 'destructive']),
  cardinality: z.enum(['new', 'one', 'none', 'ambiguous', 'multiple', 'series', 'bulk']),
  entity: z.enum(['task', 'shopping_list', 'event', 'none']), state: z.enum(['new', 'pending', 'completed', 'canceled', 'missing', 'historical']),
  recurrenceInspected: z.boolean().default(false), futureAllowed: z.boolean().default(false),
  recurring: z.boolean(), recurrenceScope: z.enum(['none', 'unspecified', 'occurrence', 'future', 'series']),
  fields: z.array(z.string().min(1).max(40)).max(8), validation: z.enum(['valid', 'missing', 'invalid']),
  authorization: z.enum(['verified', 'missing', 'changed']), completeness: z.enum(['complete', 'partial', 'saturated']),
  noOp: z.boolean(), execution: z.enum(['new', 'replay']).default('new'),
}).strict();
export type GikaPolicyFacts = z.input<typeof factsSchema>;
const registry = {
  create_shopping_list: { effect: 'create', fields: ['title'] },
  create_task: { effect: 'create', fields: ['title', 'dueDate', 'dueTime'] },
  complete_task: { effect: 'complete', fields: ['status'] },
  update_task: { effect: 'rename', fields: ['title'] },
  reschedule_task: { effect: 'reschedule', fields: ['dueDate', 'dueTime'] },
} as const;
export type GikaMutationAction = keyof typeof registry;
export const isRegisteredMutation = (name: string): name is GikaMutationAction => Object.hasOwn(registry, name);
export function classifyGikaAction(input: unknown): GikaPolicyDecision {
  const parsed = factsSchema.safeParse(input);
  if (!parsed.success) return { kind: 'deny', reason: 'INVALID_FACTS' };
  const f = parsed.data;
  if (f.authorization !== 'verified') return { kind: 'deny', reason: f.authorization === 'changed' ? 'AUTH_CHANGED' : 'AUTH_REQUIRED' };
  if (!isRegisteredMutation(f.action)) return { kind: 'deny', reason: 'UNKNOWN_ACTION' };
  if (f.effect === 'destructive') return { kind: 'deny', reason: 'DESTRUCTIVE_NOT_SUPPORTED' };
  const rule = registry[f.action];
  if (f.effect !== rule.effect || new Set(f.fields).size !== f.fields.length || (!f.recurring && f.recurrenceScope !== 'none') || (f.recurring && f.recurrenceScope === 'none')) return { kind: 'deny', reason: 'INVALID_FACTS' };
  if (f.validation === 'invalid') return { kind: 'deny', reason: 'INVALID_PAYLOAD' };
  if (!f.fields.length || f.fields.some(field => !(rule.fields as readonly string[]).includes(field))
    || (f.action === 'reschedule_task' && !f.fields.includes('dueDate'))) return { kind: 'deny', reason: 'FIELD_NOT_ALLOWED' };
  if (f.completeness !== 'complete') return { kind: 'deny', reason: 'INCOMPLETE_RESOLUTION' };
  if (['multiple', 'series', 'bulk'].includes(f.cardinality)) return { kind: 'deny', reason: 'BULK_NOT_SUPPORTED' };
  if (f.action === 'create_shopping_list' && f.recurring) return { kind: 'deny', reason: 'RECURRENCE_NOT_SUPPORTED' };
  if (f.cardinality === 'ambiguous') return { kind: 'clarify', reason: 'AMBIGUOUS_TARGET' };
  if (f.recurring) {
    if (f.recurrenceScope === 'unspecified') return { kind: 'clarify', reason: 'RECURRENCE_SCOPE_REQUIRED' };
    if (!f.recurrenceInspected || !['occurrence', 'future'].includes(f.recurrenceScope) || (f.recurrenceScope === 'future' && (!f.futureAllowed || f.action === 'complete_task'))) return { kind: 'deny', reason: 'RECURRENCE_NOT_SUPPORTED' };
  }
  if (f.validation === 'missing') return { kind: 'clarify', reason: 'MISSING_REQUIRED_DATA' };
  if (f.cardinality === 'none') return f.entity === 'none' && f.state === 'missing' && f.action !== 'create_task' ? { kind: 'clarify', reason: 'TARGET_NOT_FOUND' } : { kind: 'deny', reason: 'INVALID_FACTS' };
  if (f.entity !== (f.action === 'create_shopping_list' ? 'shopping_list' : 'task')) return { kind: 'deny', reason: 'UNSUPPORTED_TARGET' };
  if (f.noOp) return { kind: 'deny', reason: 'NO_CHANGE_REQUIRED' };
  if (f.execution === 'replay') {
    if (f.state !== 'historical' || f.cardinality !== (f.action === 'create_task' || f.action === 'create_shopping_list' ? 'new' : 'one')) return { kind: 'deny', reason: 'INVALID_FACTS' };
    // Historical descriptor only. Existing receipt/command auth and ack remain mandatory.
  } else if (f.action === 'create_task' || f.action === 'create_shopping_list') {
    if (f.cardinality !== 'new' || f.state !== 'new') return { kind: 'deny', reason: 'INVALID_FACTS' };
  } else {
    if (f.cardinality !== 'one' || !['pending', 'completed', 'canceled'].includes(f.state)) return { kind: 'deny', reason: 'INVALID_FACTS' };
    if (f.action === 'complete_task' && f.state !== 'pending') return { kind: 'deny', reason: f.state === 'completed' ? 'NO_CHANGE_REQUIRED' : 'UNSUPPORTED_TARGET' };
  }
  if (f.recurring) return { kind: 'confirm', risk: f.recurrenceScope === 'future' ? 'high' : 'medium', reason: 'RECURRENCE_PREVIEW_REQUIRED' };
  return f.action === 'reschedule_task'
    ? { kind: 'confirm', risk: 'low', reason: 'RESCHEDULE_PREVIEW_REQUIRED' }
    : { kind: 'allow' };
}
