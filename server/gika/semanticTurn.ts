import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import { createTaskArgsSchema, createTaskDescriptorSchema, gikaDomainIntentSchema, toolCallSchema, type ToolCall } from '../../packages/domain/src/gika.ts';
import { completeTaskArgsSchema } from '../../packages/domain/src/gikaCompletion.ts';
import { updateTaskArgsSchema } from '../../packages/domain/src/gikaUpdate.ts';
import { rescheduleTaskArgsSchema } from '../../packages/domain/src/gikaReschedule.ts';
import type { BatchIntent } from './batchPolicy.ts';
import { batchCallSchema } from '../../packages/domain/src/gikaBatch.ts';
import { GikaFault, type ModelContext } from './model.ts';
import { groundedDateEvidence, groundedTimeEvidence, resolveCreationIntent, validateSemanticCreation } from './createPolicy.ts';

export const organizationRequestSchema = z.object({
  name: z.literal('request_organization'),
  args: z.object({ period: z.enum(['day', 'week']) }).strict(),
}).strict();
const proposalSchema = z.union([toolCallSchema, organizationRequestSchema]);
const readNames = new Set(['get_today', 'get_day', 'get_week', 'get_shopping_lists']);

/** The provider interprets the request. This closed proposal never contains entity identity,
 * account authority, a revision, a grant or an acknowledgement of a committed effect. */
export const semanticTurnSchema = z.object({
  domainIntent: gikaDomainIntentSchema,
  certain: z.boolean(),
  explicitAction: z.boolean(),
  reply: z.string().trim().min(1).max(1000).nullable(),
  proposals: z.array(proposalSchema).max(3),
}).strict().superRefine((turn, context) => {
  const invalid = (message: string) => context.addIssue({ code: 'custom', message });
  if (!turn.certain && (turn.explicitAction || turn.proposals.length)) invalid('Interpretação incerta não pode propor efeito.');
  if (turn.domainIntent === 'OUT_OF_SCOPE' && turn.reply !== null) invalid('Fora do domínio não transmite resposta geral do provedor.');
  if (turn.proposals.some(call => call.name !== 'respond_conversation') && turn.reply !== null) invalid('Propostas não carregam alegação de execução.');
  if (turn.certain && ['SOCIAL', 'GIKA_META', 'ORGANIZATION_CONVERSATION'].includes(turn.domainIntent) && turn.reply === null) invalid('Conversa precisa de resposta contextual.');
  if (!['AGENDA_QUERY', 'AGENDA_ACTION'].includes(turn.domainIntent)) {
    if (turn.explicitAction || turn.proposals.length) invalid('Conversa não pode propor operações de agenda.');
    return;
  }
  if (turn.domainIntent === 'AGENDA_QUERY') {
    if (turn.explicitAction || turn.proposals.some(call => !readNames.has(call.name) && call.name !== 'respond_conversation')) invalid('Consulta não pode propor mutação.');
  }
  if (turn.proposals.some(call => call.name === 'get_shopping_lists') && turn.proposals.length !== 1) invalid('Consulte as listas de compras em um pedido separado.');
  const effects = turn.proposals.filter(call => !readNames.has(call.name) && call.name !== 'respond_conversation');
  if (effects.length && (!turn.explicitAction || turn.domainIntent !== 'AGENDA_ACTION' || turn.proposals.length !== 1)) invalid('Uma ação explícita por pedido.');
  if (turn.proposals.some(call => call.name === 'respond_conversation') && turn.proposals.length !== 1) invalid('Esclarecimento não pode ser misturado com operações.');
  if (turn.proposals.some(call => call.name === 'propose_organization')) invalid('A proposta de organização exige primeiro o contexto limitado do servidor.');
});
export type SemanticTurn = z.infer<typeof semanticTurnSchema>;

function nearDate(date: string, context: ModelContext) {
  if (Math.abs(Temporal.PlainDate.from(context.today).until(Temporal.PlainDate.from(date)).days) > 366) throw new GikaFault('GIKA_POLICY');
  return date;
}
export function semanticCreation(args: unknown, context: ModelContext) {
  const call = createTaskArgsSchema.parse(args);
  if (call.dueTime && !call.dueDate) return { clarification: 'Em qual dia você quer marcar esse horário?' };
  if (call.dueDate) nearDate(call.dueDate, context);
  const task = createTaskDescriptorSchema.safeParse({ ...call, timeZone: context.timeZone });
  return task.success ? { task: task.data } : { clarification: 'Esse horário não existe ou é ambíguo nesse dia. Qual horário você quer usar?' };
}
export function semanticCompletion(args: unknown, context: ModelContext) {
  const call = completeTaskArgsSchema.parse(args);
  return { title: call.title, date: nearDate(call.date ?? context.today, context) };
}
export function semanticUpdate(args: unknown, context: ModelContext) {
  const call = updateTaskArgsSchema.parse(args);
  return { title: call.title, date: nearDate(call.date ?? context.today, context), patch: call.patch };
}
export function semanticReschedule(args: unknown, context: ModelContext) {
  const call = rescheduleTaskArgsSchema.parse(args);
  nearDate(call.patch.dueDate, context);
  return { title: call.title, date: nearDate(call.date ?? context.today, context), patch: call.patch };
}

export function semanticBatch(proposal: unknown, context: ModelContext): BatchIntent {
  const call = batchCallSchema.parse(proposal);
  const date = nearDate(call.args.sourceDate, context);
  return { operation: call.name === 'batch_complete' ? 'complete' : 'reschedule', date,
    ...(call.args.title !== null ? { title: call.args.title } : {}),
    excludeTitles: call.args.excludeTitles,
    ...(call.args.scope !== null ? { recurrenceScope: call.args.scope } : {}),
    ...(call.name === 'batch_reschedule' ? { patch: { dueDate: nearDate(call.args.dueDate, context),
      ...(call.args.dueTime !== null ? { dueTime: call.args.dueTime } : {}) } } : {}),
  };
}

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const completionCue = /(?:\b(?:conclu\w*|complete\w*|terminei|acabei|registr\w*|pront\w*|marc(?:a|ar|ou|ada)\w*)\b|\bd[aá]\s+baixa\b)/i;
const updateCue = /\b(?:muda\w*|mude\w*|renome\w*|altera\w*|ajust\w*|edit\w*|corrig\w*|cham(?:a|ar|ou|ado)\w*)\b/i;
const rescheduleCue = /(?:\b(?:move\w*|mova\w*|reagend\w*|joga\w*|jogue\w*|passa\w*|passe\w*|troca\w*)\b|\bem\s+vez\s+de\b)/i;
const dateEvidencePattern = /\b(?:hoje|amanh(?:a|ã)|depois de amanh(?:a|ã)|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/gi;

function mentioned(text: string, value: string) {
  const source = normalized(text).trim();
  const needle = normalized(value).trim();
  if (!needle || /^(?:tarefa|atividade|evento|compromisso)$/i.test(needle)) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(source);
}

function dateMentioned(text: string, expected: string, context: ModelContext, allowAdditional = false) {
  const evidence = groundedDateEvidence(text, context);
  if (!evidence.ambiguous && (evidence.value === expected || (evidence.value === null && expected === context.today))) return true;
  if (!allowAdditional || !evidence.ambiguous) return false;
  const values = [...normalized(text).matchAll(dateEvidencePattern)]
    .map(match => resolveCreationIntent(`Adiciona Referência temporal ${match[0]}`, context))
    .map(result => result.task?.dueDate ?? null)
    .filter((value): value is string => Boolean(value));
  return values.includes(expected) && new Set(values).size <= 2;
}

function timeMentioned(text: string, expected: string | null | undefined) {
  const evidence = groundedTimeEvidence(text);
  if (expected === null || expected === undefined) return !evidence.mentioned;
  return !evidence.ambiguous && evidence.value === expected;
}

/** Validates that a semantic mutation is grounded in the current user turn.
 * Conversation history is advisory context and cannot supply targets or patches. */
export function validateSemanticMutation(call: Extract<ToolCall, { name: 'create_task' }>, text: string, context: ModelContext): ReturnType<typeof validateSemanticCreation>;
export function validateSemanticMutation(call: Extract<ToolCall, { name: 'complete_task' }>, text: string, context: ModelContext): ReturnType<typeof semanticCompletion>;
export function validateSemanticMutation(call: Extract<ToolCall, { name: 'update_task' }>, text: string, context: ModelContext): ReturnType<typeof semanticUpdate>;
export function validateSemanticMutation(call: Extract<ToolCall, { name: 'reschedule_task' }>, text: string, context: ModelContext): ReturnType<typeof semanticReschedule>;
export function validateSemanticMutation(call: Extract<ToolCall, { name: 'batch_complete' | 'batch_reschedule' }>, text: string, context: ModelContext): BatchIntent;
export function validateSemanticMutation(call: ToolCall, text: string, context: ModelContext): ReturnType<typeof validateSemanticCreation> | ReturnType<typeof semanticCompletion> | ReturnType<typeof semanticUpdate> | ReturnType<typeof semanticReschedule> | BatchIntent;
export function validateSemanticMutation(call: ToolCall, text: string, context: ModelContext) {
  if (call.name === 'create_task') return validateSemanticCreation(call.args, text, context);
  if (call.name === 'complete_task') {
    const intent = semanticCompletion(call.args, context);
    if (!completionCue.test(text) || !mentioned(text, intent.title) || !dateMentioned(text, intent.date, context)) throw new GikaFault('GIKA_POLICY');
    return intent;
  }
  if (call.name === 'update_task') {
    const intent = semanticUpdate(call.args, context);
    if (!updateCue.test(text) || !mentioned(text, intent.title) || !mentioned(text, intent.patch.title) || !dateMentioned(text, intent.date, context)) throw new GikaFault('GIKA_POLICY');
    return intent;
  }
  if (call.name === 'reschedule_task') {
    const intent = semanticReschedule(call.args, context);
    if (!rescheduleCue.test(text) || !mentioned(text, intent.title) || !dateMentioned(text, intent.patch.dueDate, context, true) || !timeMentioned(text, intent.patch.dueTime)) throw new GikaFault('GIKA_POLICY');
    return intent;
  }
  if (call.name === 'batch_complete' || call.name === 'batch_reschedule') {
    const intent = semanticBatch(call, context);
    if (!dateMentioned(text, intent.date, context) || (!completionCue.test(text) && call.name === 'batch_complete') || (!rescheduleCue.test(text) && call.name === 'batch_reschedule')) throw new GikaFault('GIKA_POLICY');
    if (intent.title && !mentioned(text, intent.title)) throw new GikaFault('GIKA_POLICY');
    if (intent.patch && (!dateMentioned(text, intent.patch.dueDate, context) || !timeMentioned(text, intent.patch.dueTime))) throw new GikaFault('GIKA_POLICY');
    return intent;
  }
  throw new GikaFault('GIKA_POLICY');
}
