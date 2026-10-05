import { describe, expect, it } from 'vitest';
import { semanticTurnSchema } from '../../server/gika/semanticTurn';

const read = { name: 'get_today', args: {} };
const clarification = { name: 'respond_conversation', args: { text: 'Qual tarefa?' } };
const mutations = [
  { name: 'create_task', args: { title: 'Academia', dueDate: '2026-10-06', dueTime: null } },
  { name: 'complete_task', args: { title: 'Academia', date: null } },
  { name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino' } } },
  { name: 'reschedule_task', args: { title: 'Academia', date: null, patch: { dueDate: '2026-10-06' } } },
  { name: 'batch_complete', args: { sourceDate: '2026-10-05', title: null, excludeTitles: [], scope: null } },
  { name: 'batch_reschedule', args: { sourceDate: '2026-10-05', title: null, excludeTitles: [], scope: null, dueDate: '2026-10-06', dueTime: null } },
  { name: 'request_organization', args: { period: 'day' } },
];
const create = mutations[0]!;
const conversationIntents = ['SOCIAL', 'GIKA_META', 'ORGANIZATION_CONVERSATION', 'OUT_OF_SCOPE'];
function turn(overrides: Record<string, unknown> = {}) {
  return { domainIntent: 'AGENDA_ACTION', certain: true, reply: null, explicitAction: false, proposals: [], ...overrides };
}

// Synthetic provider outputs exercise the software contract, not live semantic accuracy.
describe('SemanticTurn contract', () => {
  it.each(conversationIntents)('%s remains conversational even when certain', domainIntent => {
    const value = turn({ domainIntent, reply: domainIntent === 'OUT_OF_SCOPE' ? null : 'Posso ajudar com a agenda.' });
    expect(semanticTurnSchema.parse(value)).toEqual(value);
    expect(semanticTurnSchema.safeParse({ ...value, explicitAction: true }).success).toBe(false);
    expect(semanticTurnSchema.safeParse({ ...value, proposals: [read] }).success).toBe(false);
    expect(semanticTurnSchema.safeParse({ ...value, proposals: [create] }).success).toBe(false);
  });

  it('uncertainty cannot carry reads, mutations or an explicit action flag', () => {
    const value = turn({ certain: false, reply: 'Qual tarefa você quer adicionar?' });
    expect(semanticTurnSchema.parse(value)).toEqual(value);
    for (const proposals of [[read], [create], [clarification]]) {
      expect(semanticTurnSchema.safeParse({ ...value, proposals }).success).toBe(false);
    }
    expect(semanticTurnSchema.safeParse({ ...value, explicitAction: true }).success).toBe(false);
  });

  it('a synthetic negated or hypothetical action without explicit intent cannot propose a mutation', () => {
    const value = turn({ reply: 'Quer adicionar alguma tarefa?', explicitAction: false });
    expect(semanticTurnSchema.parse(value)).toEqual(value);
    expect(semanticTurnSchema.safeParse({ ...value, proposals: [create] }).success).toBe(false);
  });

  it('permits bounded query tools and a single clarification without a mutation', () => {
    const queries = [read, { name: 'get_day', args: { date: '2026-10-06' } }, { name: 'get_week', args: { date: '2026-10-05' } }];
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'AGENDA_QUERY', proposals: queries })).success).toBe(true);
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'AGENDA_QUERY', proposals: [clarification] })).success).toBe(true);
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'AGENDA_QUERY', proposals: [...queries, read] })).success).toBe(false);
  });

  it.each(mutations)('AGENDA_QUERY rejects $name even with explicitAction=true', proposal => {
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'AGENDA_QUERY', explicitAction: true, proposals: [proposal] })).success).toBe(false);
  });

  it.each(mutations)('$name requires explicit action and remains a single proposal', proposal => {
    const value = turn({ proposals: [proposal] });
    expect(semanticTurnSchema.safeParse(value).success).toBe(false);
    expect(semanticTurnSchema.safeParse({ ...value, explicitAction: true }).success).toBe(true);
    expect(semanticTurnSchema.safeParse({ ...value, explicitAction: true, proposals: [proposal, proposal] }).success).toBe(false);
  });

  it('rejects mixed effects and mixing clarification with any tool', () => {
    for (const proposals of [[create, read], [create, mutations[1]!], [read, clarification], [create, clarification]]) {
      expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals })).success).toBe(false);
    }
  });

  it('keeps clarification text separate from an executable proposal', () => {
    expect(semanticTurnSchema.safeParse(turn({ reply: 'Qual horário?', proposals: [] })).success).toBe(true);
    expect(semanticTurnSchema.safeParse(turn({ proposals: [clarification] })).success).toBe(true);
  });

  it.each(['uid', 'entityId', 'operationId', 'expectedRevision', 'timeZone', 'confirmationToken', 'path'])('rejects model-supplied %s at the turn, call and argument levels', field => {
    expect(semanticTurnSchema.safeParse(turn({ [field]: 'synthetic' })).success).toBe(false);
    expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals: [{ ...create, [field]: 'synthetic' }] })).success).toBe(false);
    expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals: [{ ...create, args: { ...create.args, [field]: 'synthetic' } }] })).success).toBe(false);
  });

  it('rejects extra nested patch fields, unsupported tools and malformed organization markers', () => {
    for (const proposal of [
      { name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino', dueDate: '2026-10-06' } } },
      { name: 'delete_task', args: { title: 'Academia' } },
      { name: 'activity.update', args: { title: 'Academia' } },
      { name: 'propose_organization', args: { items: [{ ref: 0, action: 'move', dueDate: '2026-10-06', dueTime: null }] } },
      { name: 'request_organization', args: { period: 'month' } },
      { name: 'request_organization', args: { period: 'day', uid: 'synthetic' } },
    ]) {
      expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals: [proposal] })).success).toBe(false);
    }
    expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals: [{ name: 'request_organization', args: { period: 'week' } }] })).success).toBe(true);
  });

  it('rejects general answers outside the domain and success claims attached to proposals', () => {
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'OUT_OF_SCOPE', reply: 'Resposta enciclopédica' })).success).toBe(false);
    expect(semanticTurnSchema.safeParse(turn({ explicitAction: true, proposals: [create], reply: 'Já salvei.' })).success).toBe(false);
  });

  it('requires the closed intent and exact envelope fields', () => {
    expect(semanticTurnSchema.safeParse(turn({ domainIntent: 'GENERAL' })).success).toBe(false);
    for (const field of ['domainIntent', 'certain', 'reply', 'explicitAction', 'proposals']) {
      const value: Record<string, unknown> = turn();
      delete value[field];
      expect(semanticTurnSchema.safeParse(value).success).toBe(false);
    }
    expect(semanticTurnSchema.safeParse(turn({ certain: 'true' })).success).toBe(false);
    expect(semanticTurnSchema.safeParse(turn({ proposals: create })).success).toBe(false);
  });
});
