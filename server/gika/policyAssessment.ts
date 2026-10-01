import type { CompletionResolution } from '../../packages/domain/src/gikaCompletion.ts';
import type { UpdateResolution } from '../../packages/domain/src/gikaUpdate.ts';
import type { RescheduleResolution } from '../../packages/domain/src/gikaReschedule.ts';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import { backendLog } from '../logger.ts';
import { classifyGikaAction, isRegisteredMutation, type GikaMutationAction, type GikaPolicyDecision, type GikaPolicyFacts } from './actionPolicy.ts';
const effects = { create_task: 'create', complete_task: 'complete', update_task: 'rename', reschedule_task: 'reschedule' } as const;
const fields = { create_task: ['title', 'dueDate', 'dueTime'], complete_task: ['status'], update_task: ['title'], reschedule_task: ['dueDate'] };
export function assessPolicy(facts: GikaPolicyFacts): GikaPolicyDecision {
  const started = Date.now(); const decision = classifyGikaAction(facts); const elapsed = Date.now() - started;
  backendLog('info', 'gika.policy_decision', {
    action: isRegisteredMutation(facts.action) ? facts.action : 'unknown',
    decision: decision.kind, ...(decision.kind !== 'allow' ? { reason: decision.reason } : {}),
    latencyBucket: elapsed < 10 ? 'lt_10ms' : elapsed < 100 ? '10_99ms' : 'gte_100ms',
  });
  return decision;
}
function base(action: GikaMutationAction, authorization: GikaPolicyFacts['authorization']): GikaPolicyFacts {
  return { action, effect: effects[action], cardinality: action === 'create_task' ? 'new' : 'one',
    entity: 'task', state: action === 'create_task' ? 'new' : 'pending', recurring: false, recurrenceScope: 'none',
    fields: fields[action], validation: 'valid', authorization, completeness: 'complete', noOp: false };
}
export function assessCreation(complete: boolean, authorization: GikaPolicyFacts['authorization']) {
  return assessPolicy({ ...base('create_task', authorization), validation: complete ? 'valid' : 'missing' });
}
export function assessMissingIntent(action: Exclude<GikaMutationAction, 'create_task'>, authorization: GikaPolicyFacts['authorization']) {
  return assessPolicy({ ...base(action, authorization), validation: 'missing' });
}
export function assessResolution(action: Exclude<GikaMutationAction, 'create_task'>, intent: { title: string; patch?: object }, read: ReadResult, resolution: { task?: unknown; resolution?: { status: CompletionResolution['status'] | UpdateResolution['status'] | RescheduleResolution['status'] } }, authorization: GikaPolicyFacts['authorization']) {
  // Same exact-title semantics as the adopted resolvers; no fuzzy/new query.
  const matches = read.items.filter(item => item.title.trim().toLocaleLowerCase('pt-BR') === intent.title.trim().toLocaleLowerCase('pt-BR'));
  const target = matches.length === 1 ? matches[0] : undefined;
  return assessPolicy({ ...base(action, authorization),
    cardinality: matches.length > 1 ? 'ambiguous' : target ? 'one' : 'none',
    entity: target?.kind ?? 'none', state: target?.status ?? 'missing',
    recurring: Boolean(target?.seriesId || target?.occurrenceKey), recurrenceScope: target?.seriesId || target?.occurrenceKey ? 'unspecified' : 'none',
    fields: intent.patch ? Object.keys(intent.patch) : ['status'],
    completeness: read.items.length >= 50 ? 'saturated' : read.partial ? 'partial' : 'complete',
    validation: resolution.resolution?.status === 'clarify' ? 'missing' : 'valid',
    noOp: ['already_completed', 'unchanged'].includes(resolution.resolution?.status ?? ''),
  });
}
export function assessReplay(kind: 'create' | 'complete' | 'update' | 'reschedule', authorization: GikaPolicyFacts['authorization']) {
  const action = ({ create: 'create_task', complete: 'complete_task', update: 'update_task', reschedule: 'reschedule_task' } as const)[kind];
  return assessPolicy({ ...base(action, authorization), execution: 'replay', state: 'historical' });
}

export function assessMultipleActions(action: GikaMutationAction, authorization: GikaPolicyFacts['authorization']) {
  return assessPolicy({ ...base(action, authorization), cardinality: 'multiple' });
}

export function assessInvalidTool(action: string) {
  return assessPolicy({ ...base(isRegisteredMutation(action) ? action : 'create_task', 'verified'), action, validation: 'invalid' });
}
