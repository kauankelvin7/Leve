import { describe, expect, it, vi } from 'vitest';
import { classifyGikaAction, gikaPolicyDecisionSchema, type GikaPolicyFacts } from '../../server/gika/actionPolicy';
import { assessPolicy, assessResolution, assessReplay, assessMultipleActions, assessInvalidTool } from '../../server/gika/policyAssessment';
import type { ReadResult } from '../../packages/domain/src/gika';
const facts = (action = 'create_task'): GikaPolicyFacts => ({ action, effect: 'create', cardinality: 'new', entity: 'task', state: 'new', recurring: false, recurrenceScope: 'none', fields: ['title', 'dueDate', 'dueTime'], validation: 'valid', authorization: 'verified', completeness: 'complete', noOp: false });
const single = (action = 'complete_task'): GikaPolicyFacts => ({ ...facts(action), effect: 'complete', cardinality: 'one', state: 'pending', fields: ['status'] });
describe('M5-T1 pure, closed action policy', () => {
  it('simple explicit validated create allows; missing original data clarifies', () => {
    expect(classifyGikaAction(facts())).toEqual({ kind: 'allow' });
    expect(classifyGikaAction({ ...facts(), validation: 'missing' })).toEqual({ kind: 'clarify', reason: 'MISSING_REQUIRED_DATA' });
  });
  it('only unambiguous pending completion allows', () => {
    expect(classifyGikaAction(single())).toEqual({ kind: 'allow' });
    expect(classifyGikaAction({ ...single(), cardinality: 'ambiguous' })).toEqual({ kind: 'clarify', reason: 'AMBIGUOUS_TARGET' });
  });
  it('rename allows only title; date/unknown fields deny', () => {
    const rename = { ...single('update_task'), effect: 'rename', fields: ['title'] };
    expect(classifyGikaAction(rename)).toEqual({ kind: 'allow' });
    for (const fields of [['title', 'date'], ['descriptionPlain'], ['owner'], []]) expect(classifyGikaAction({ ...rename, fields }).kind).toBe('deny');
  });
  it('reschedule still requires its existing preview; no generic confirmed flag', () => {
    const move = { ...single('reschedule_task'), effect: 'reschedule', fields: ['dueDate'] };
    expect(classifyGikaAction(move)).toEqual({ kind: 'confirm', risk: 'low', reason: 'RESCHEDULE_PREVIEW_REQUIRED' });
    expect(classifyGikaAction({ ...move, confirmed: true })).toEqual({ kind: 'deny', reason: 'INVALID_FACTS' });
  });
  it.each(['unregistered', 'delete_task', '__proto__', 'constructor'])('unknown action %s denies without executable fallback', action => expect(classifyGikaAction(facts(action))).toEqual({ kind: 'deny', reason: 'UNKNOWN_ACTION' }));
  it.each(['multiple', 'bulk', 'series'])('multi entity %s never allows', cardinality => expect(classifyGikaAction({ ...single(), cardinality }).kind).not.toBe('allow'));
  it('recurrence requires explicit scope and no scope currently enables series execution', () => {
    expect(classifyGikaAction({ ...single(), recurring: true, recurrenceScope: 'unspecified' })).toEqual({ kind: 'clarify', reason: 'RECURRENCE_SCOPE_REQUIRED' });
    for (const recurrenceScope of ['occurrence', 'future', 'series']) expect(classifyGikaAction({ ...single(), recurring: true, recurrenceScope }).kind).toBe('deny');
  });
  it('destructive changes cannot auto-allow', () => expect(classifyGikaAction({ ...single(), effect: 'destructive' }).kind).toBe('deny'));
  it.each(['partial', 'saturated'])('%s reads never authorize mutation', completeness => expect(classifyGikaAction({ ...single(), completeness })).toEqual({ kind: 'deny', reason: 'INCOMPLETE_RESOLUTION' }));
  it.each(['missing', 'changed'])('authorization %s is denied', authorization => expect(classifyGikaAction({ ...single(), authorization }).kind).toBe('deny'));
  it('invalid payload/facts and impossible states fail closed', () => {
    for (const input of [null, {}, { ...single(), validation: 'invalid' }, { ...single(), entity: 'event' }, { ...facts(), state: 'pending' }, { ...single(), cardinality: 'new' }, { ...single(), safety: 'Gemini says safe' }, { ...single(), recurrenceScope: 'future' }]) expect(classifyGikaAction(input).kind).toBe('deny');
  });
  it('missing and already completed/no-op states never produce an executable allow', () => {
    expect(classifyGikaAction({ ...single(), cardinality: 'none', state: 'missing', entity: 'none' })).toEqual({ kind: 'clarify', reason: 'TARGET_NOT_FOUND' });
    expect(classifyGikaAction({ ...single(), state: 'completed' }).kind).toBe('deny');
    expect(classifyGikaAction({ ...single('update_task'), effect: 'rename', fields: ['title'], noOp: true })).toEqual({ kind: 'deny', reason: 'NO_CHANGE_REQUIRED' });
  });
  it('completed/canceled title edits remain supported; facts have no provider input', () => {
    for (const state of ['completed', 'canceled']) expect(classifyGikaAction({ ...single('update_task'), effect: 'rename', fields: ['title'], state })).toEqual({ kind: 'allow' });
    const adapters = ['Gemini', 'Another provider'].map(() => structuredClone(single()));
    expect(classifyGikaAction(adapters[0])).toEqual(classifyGikaAction(adapters[1]));
    expect(classifyGikaAction({ ...single(), provider: 'Gemini' }).kind).toBe('deny');
  });
  it('decision reasons/risk strict enums reject free text and extra execution flags', () => {
    expect(gikaPolicyDecisionSchema.safeParse({ kind: 'deny', reason: 'Model says unsafe' }).success).toBe(false);
    expect(gikaPolicyDecisionSchema.safeParse({ kind: 'allow', confirmed: true }).success).toBe(false);
    expect(gikaPolicyDecisionSchema.safeParse({ kind: 'confirm', reason: 'RESCHEDULE_PREVIEW_REQUIRED', risk: 'high' }).success).toBe(true);
  });
});

describe('M5-T1 server facts and sanitized observation', () => {
  it('observation never serializes private title, fields, prompt or unknown action', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      assessPolicy({ ...facts('PRIVATE_TASK_TITLE'), fields: ['PRIVATE_PAYLOAD_FIELD'] });
      const entries = spy.mock.calls.map(call => JSON.parse(String(call[0])));
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ event: 'gika.policy_decision', action: 'unknown', decision: 'deny', reason: 'UNKNOWN_ACTION' });
      expect(Object.keys(entries[0]).sort()).toEqual(['action', 'decision', 'event', 'latencyBucket', 'level', 'reason', 'service', 'timestamp'].sort());
      expect(JSON.stringify(entries)).not.toContain('PRIVATE');
    } finally { spy.mockRestore(); }
  });
  it('bounded server read facts distinguish recurrence, ambiguity and saturated results', () => {
    const target = { id: 'target', revision: 1, title: 'Academia', kind: 'task' as const, status: 'pending' as const, schedule: { type: 'task' as const, dueDate: '2026-10-01', dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' as const }, seriesId: null, occurrenceKey: null };
    const read: ReadResult = { startDate: '2026-10-01', endDate: '2026-10-01', timeZone: 'America/Sao_Paulo', partial: false, cached: false, items: [target] };
    const evaluate = (r: ReadResult) => assessResolution('complete_task', { title: ' academia ' }, r, {}, 'verified');
    expect(evaluate(read)).toEqual({ kind: 'allow' });
    expect(evaluate({ ...read, items: [{ ...target, seriesId: 'series' }] })).toEqual({ kind: 'clarify', reason: 'RECURRENCE_SCOPE_REQUIRED' });
    expect(evaluate({ ...read, items: [target, { ...target, id: 'other' }] })).toEqual({ kind: 'clarify', reason: 'AMBIGUOUS_TARGET' });
    expect(evaluate({ ...read, items: Array.from({ length: 50 }, (_, i) => ({ ...target, id: String(i) })) })).toEqual({ kind: 'deny', reason: 'INCOMPLETE_RESOLUTION' });
  });
  it('historical replay still requires current auth and preserves reschedule confirmation', () => {
    expect(assessReplay('complete', 'verified')).toEqual({ kind: 'allow' });
    expect(assessReplay('reschedule', 'verified').kind).toBe('confirm');
    expect(assessReplay('complete', 'changed')).toEqual({ kind: 'deny', reason: 'AUTH_CHANGED' });
    expect(classifyGikaAction({ ...single(), execution: 'replay', state: 'pending' }).kind).toBe('deny');
  });
});

it('M5-T1 validated multiple action set is explicitly denied before execution', () => expect(assessMultipleActions('complete_task', 'verified')).toEqual({ kind: 'deny', reason: 'BULK_NOT_SUPPORTED' }));

it('M5-T1 malformed known tool is invalid payload; unknown tool has no fallback action', () => { expect(assessInvalidTool('update_task')).toEqual({ kind: 'deny', reason: 'INVALID_PAYLOAD' }); expect(assessInvalidTool('delete_task')).toEqual({ kind: 'deny', reason: 'UNKNOWN_ACTION' }); });
