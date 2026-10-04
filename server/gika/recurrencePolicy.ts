import { recurrenceEffectSchema, recurrenceProposalSchema, type RecurrenceProposal } from '../../packages/domain/src/gikaRecurrence.ts';
import type { ReadItem } from '../../packages/domain/src/gika.ts';
import type { GikaRequest } from '../../packages/domain/src/gika.ts';
import { hashValue } from '../hash.ts';
import { GikaFault } from './model.ts';
import { assessPolicy } from './policyAssessment.ts';
import type { ProposedScope } from './scopeIntent.ts';
import type { ReadRepository } from './reads.ts';
import { issueRecurrenceChoice, issueRecurrenceConfirmation } from './confirmation.ts';

export function assessRecurrence(proposal: RecurrenceProposal, scope?: ProposedScope) {
  const operation = proposal.operation;
  return assessPolicy({ action: `${operation === 'update' ? 'update' : operation === 'complete' ? 'complete' : 'reschedule'}_task`, effect: operation === 'update' ? 'rename' : operation, cardinality: 'one', entity: 'task', state: operation === 'complete' ? 'pending' : 'pending', recurring: true, recurrenceScope: scope === 'all' ? 'series' : scope ?? 'unspecified', fields: Object.keys(proposal.patch), validation: 'valid', authorization: 'verified', completeness: 'complete', noOp: false, recurrenceInspected: true, futureAllowed: proposal.recurrence.futureAllowed });
}
function newSeriesIdentity(uid: string, operationId: string) {
  const hash = hashValue(`leve:gika-recurrence:v1:${uid}:${operationId}`);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export function recurrenceEffect(uid: string, input: GikaRequest, proposal: RecurrenceProposal, scope: 'occurrence' | 'future') {
  const decision = assessRecurrence(proposal, scope);
  if (decision.kind !== 'confirm') throw new GikaFault('GIKA_POLICY');
  return recurrenceEffectSchema.parse({ ...proposal, scope, newSeriesId: scope === 'future' ? newSeriesIdentity(uid, input.requestId) : null });
}
export async function prepareRecurrence(repository: ReadRepository, uid: string, input: GikaRequest, target: ReadItem, operation: RecurrenceProposal['operation'], patch: unknown, scope?: ProposedScope) {
  if (target.schedule.type !== 'task' || !target.schedule.dueDate || !repository.inspectRecurrence) return { unsupported: true as const };
  const task = { id: target.id, title: target.title, dueDate: target.schedule.dueDate, dueTime: target.schedule.dueTime, timeZone: target.schedule.timeZone, revision: target.revision };
  const recurrence = await repository.inspectRecurrence(uid, task);
  if (!recurrence) return { unsupported: true as const };
  const proposal = recurrenceProposalSchema.parse({ task, recurrence, operation, patch });
  const decision = assessRecurrence(proposal, scope);
  if (decision.kind === 'clarify') return { recurrenceChoice: issueRecurrenceChoice(uid, input, proposal) };
  if (decision.kind === 'deny') return { unsupported: true as const };
  if (decision.kind !== 'confirm' || !scope || scope === 'all') throw new GikaFault('GIKA_POLICY');
  return { recurrenceConfirmation: issueRecurrenceConfirmation(uid, input, recurrenceEffect(uid, input, proposal, scope)) };
}
