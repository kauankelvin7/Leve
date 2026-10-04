import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { scopedIntent } from '../../server/gika/scopeIntent';
import { assessRecurrence, recurrenceEffect } from '../../server/gika/recurrencePolicy';
import { createConfirmationSigner } from '../../server/gika/confirmation';
import { recurrenceEnvelope, recurrenceEffectSchema, type RecurrenceProposal } from '../../packages/domain/src/gikaRecurrence';
import { gikaInterpretationSchema, gikaResponseSchema, toolCallSchema } from '../../packages/domain/src/gika';
import { validateReschedule } from '../../server/gika/reschedulePolicy';
import { resolveUpdateIntent } from '../../server/gika/updatePolicy';
const context = { today: '2026-10-01', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const request = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'Move Academia para amanhã' };
const proposal: RecurrenceProposal = { operation: 'reschedule', task: { id: 'task', title: 'Academia', dueDate: context.today, dueTime: '19:00', timeZone: context.timeZone, revision: 1 }, patch: { dueDate: '2026-10-02' }, recurrence: { seriesId: 'series', occurrenceKey: context.today, seriesHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), futureHash: 'c'.repeat(64), futureCount: 3, futureAllowed: true } };
describe('M5-T3 explicit scope and deterministic recurrence policy', () => {
  it.each(['só hoje', 'apenas essa', 'essa ocorrência', 'somente esta ocorrência'])('occurrence evidence %s', marker => {
    const scoped = scopedIntent(`Move Academia ${marker} para amanhã`, { recurrenceScope: 'occurrence' });
    expect(scoped.scope).toBe('occurrence'); expect(validateReschedule({ title: 'Academia', date: null, patch: proposal.patch }, scoped.text, context)).toMatchObject({ title: 'Academia', patch: proposal.patch });
  });
  it.each(['daqui pra frente', 'todas as próximas', 'esta e as próximas'])('future evidence %s', marker => expect(scopedIntent(`Move Academia para amanhã ${marker}`, { recurrenceScope: 'future' }).scope).toBe('future'));
  it('scope clauses with punctuation preserve the requested title patch', () => {
    const scoped = scopedIntent('Renomeia Academia para Treino, daqui pra frente', { recurrenceScope: 'future' });
    expect(resolveUpdateIntent(scoped.text, context)).toMatchObject({ patch: { title: 'Treino' } });
  });
  it('missing scope clarifies; series-all never falls back to future; future completion unsupported', () => {
    expect(assessRecurrence(proposal)).toEqual({ kind: 'clarify', reason: 'RECURRENCE_SCOPE_REQUIRED' });
    expect(assessRecurrence(proposal, 'occurrence')).toMatchObject({ kind: 'confirm', risk: 'medium', reason: 'RECURRENCE_PREVIEW_REQUIRED' });
    expect(assessRecurrence(proposal, 'future')).toMatchObject({ kind: 'confirm', risk: 'high' });
    expect(assessRecurrence(proposal, 'all').kind).toBe('deny');
    expect(assessRecurrence({ ...proposal, operation: 'complete', patch: { status: 'completed' } }, 'future').kind).toBe('deny');
    expect(assessRecurrence({ ...proposal, recurrence: { ...proposal.recurrence, futureAllowed: false } }, 'future').kind).toBe('deny');
  });
  it('model cannot invent scope; conflicting scopes and sim do not authorize selection', () => {
    expect(() => scopedIntent(request.text, { recurrenceScope: 'future' })).toThrow();
    expect(() => scopedIntent(`${request.text} só hoje todas as próximas`, {})).toThrow();
    expect(scopedIntent('sim', {})).toEqual({ text: 'sim', scope: undefined });
  });
  it('quoted scope words and title whitespace are data, not scope instructions', () => {
    const source = 'Renomeia "Academia" para "Todas as próximas  tarefas"';
    expect(scopedIntent(source, {})).toEqual({ text: source, scope: undefined });
    expect(resolveUpdateIntent(scopedIntent(source, {}).text, context)).toMatchObject({ patch: { title: 'Todas as próximas  tarefas' } });
  });
  it('explicit time-only preserves the selected civil date through the existing temporal parser', () => {
    expect(validateReschedule({ title: 'Academia', date: null, patch: { dueDate: context.today, dueTime: '20:00' } }, 'Mova Academia para 20h', context)).toMatchObject({ patch: { dueDate: context.today, dueTime: '20:00' } });
    expect(validateReschedule({ title: 'Academia', date: '2026-10-02', patch: { dueDate: '2026-10-02', dueTime: '20:00' } }, 'Mova Academia amanhã para 20h', context)).toMatchObject({ patch: { dueDate: '2026-10-02', dueTime: '20:00' } });
  });
  it('strict tool scope does not accept UID/IDs/revision or unknown scope; no recurrence success from model', () => {
    const call = { name: 'reschedule_task', args: { title: 'Academia', date: null, patch: proposal.patch, recurrenceScope: 'future' } };
    expect(toolCallSchema.safeParse(call).success).toBe(true);
    for (const args of [{ ...call.args, recurrenceScope: 'maybe' }, { ...call.args, uid: 'other' }, { ...call.args, activityId: 'task' }]) expect(toolCallSchema.safeParse({ ...call, args }).success).toBe(false);
    expect(gikaInterpretationSchema.safeParse({ simulated: false, text: 'Movida.', reads: [], recurrenceApplied: {} }).success).toBe(false);
  });
});
describe('M5-T3 choice is distinct from a sealed confirmation grant', () => {
  it('choice and confirmation bind scope, entity, revision, payload, UID and operation', async () => {
    const signer = createConfirmationSigner(randomBytes(32)), choice = signer.issueRecurrenceChoice('uid-a', request, proposal);
    expect(choice.options).toEqual(['occurrence', 'future']);
    expect(signer.verifyRecurrenceChoice('uid-a', request, choice.token)).toEqual(choice);
    const effect = recurrenceEffect('uid-a', request, proposal, 'occurrence');
    const confirmation = signer.issueRecurrenceConfirmation('uid-a', request, effect);
    const command = await recurrenceEnvelope(effect, request, confirmation.token);
    expect(signer.verifyRecurrenceConfirmation('uid-a', command)).toEqual(effect);
    for (const value of [{ ...command, entityId: 'other' }, { ...command, expectedRevision: 2 }, { ...command, operationId: crypto.randomUUID() }, { ...command, payload: { dueDate: context.today } }, { ...command, command: 'activity.updateFuture', payload: { patch: proposal.patch, newSeriesId: crypto.randomUUID() } }, { ...command, gikaRecurrence: { ...command.gikaRecurrence!, confirmationToken: choice.token } }]) expect(() => signer.verifyRecurrenceConfirmation('uid-a', value)).toThrow();
    expect(() => signer.verifyRecurrenceConfirmation('uid-b', command)).toThrow();
    expect(() => signer.verifyRecurrenceChoice('uid-a', request, confirmation.token)).toThrow();
    expect(() => signer.verifyRecurrenceChoice('uid-b', request, choice.token)).toThrow();
  });
  it('future effect gets stable software ID and different user/intent receives distinct ID', () => {
    const first = recurrenceEffect('uid-a', request, proposal, 'future');
    expect(recurrenceEffect('uid-a', request, proposal, 'future')).toEqual(first);
    expect(recurrenceEffect('uid-b', request, proposal, 'future').newSeriesId).not.toBe(first.newSeriesId);
    expect(recurrenceEffect('uid-a', { ...request, requestId: crypto.randomUUID() }, proposal, 'future').newSeriesId).not.toBe(first.newSeriesId);
    expect(recurrenceEffectSchema.safeParse({ ...first, newSeriesId: null }).success).toBe(false);
  });
  it('expired choice/confirmation cannot renew themselves; changed signature fails', async () => {
    let now = 1_000_000; const signer = createConfirmationSigner(randomBytes(32), () => now), choice = signer.issueRecurrenceChoice('uid-a', request, proposal);
    const effect = recurrenceEffect('uid-a', request, proposal, 'occurrence'), confirmation = signer.issueRecurrenceConfirmation('uid-a', request, effect), command = await recurrenceEnvelope(effect, request, confirmation.token);
    const [body, signature] = confirmation.token.split('.'), claims = JSON.parse(Buffer.from(body!, 'base64url').toString()); claims.effect.scope = 'future';
    expect(() => signer.verifyRecurrenceConfirmation('uid-a', { ...command, gikaRecurrence: { ...command.gikaRecurrence!, confirmationToken: `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}` } })).toThrow();
    now += 15 * 60_000;
    expect(() => signer.verifyRecurrenceChoice('uid-a', request, choice.token)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_EXPIRED' }));
    expect(() => signer.verifyRecurrenceConfirmation('uid-a', command)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_EXPIRED' }));
  });
  it('choosing or retrying selection inherits the original expiry without extending it', async () => {
    let now = 1_000_000;
    const signer = createConfirmationSigner(randomBytes(32), () => now);
    const choice = signer.issueRecurrenceChoice('uid-a', request, proposal);
    const effect = recurrenceEffect('uid-a', request, proposal, 'occurrence');
    if (effect.operation !== 'reschedule') throw Error('Unexpected effect');
    now += 10 * 60_000;
    const confirmation = signer.issueRecurrenceConfirmation('uid-a', request, effect, choice.token);
    const command = await recurrenceEnvelope(effect, request, confirmation.token);
    expect(signer.verifyRecurrenceConfirmation('uid-a', command)).toEqual(effect);
    now += 4 * 60_000;
    expect(signer.issueRecurrenceConfirmation('uid-a', request, effect, choice.token)).toEqual(confirmation);
    expect(() => signer.issueRecurrenceConfirmation('uid-a', request, { ...effect, patch: { dueDate: '2026-10-03' } }, choice.token)).toThrow();
    expect(() => signer.issueRecurrenceConfirmation('uid-b', request, effect, choice.token)).toThrow();
    now += 60_000;
    expect(() => signer.verifyRecurrenceConfirmation('uid-a', command)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_EXPIRED' }));
    expect(() => signer.issueRecurrenceConfirmation('uid-a', request, effect, choice.token)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_EXPIRED' }));
  });
  it('choice/preview cannot coexist with another action or reads; response is strict', () => {
    const signer = createConfirmationSigner(randomBytes(32)), choice = signer.issueRecurrenceChoice('uid-a', request, proposal);
    const confirmation = signer.issueRecurrenceConfirmation('uid-a', request, recurrenceEffect('uid-a', request, proposal, 'occurrence'));
    expect(gikaResponseSchema.safeParse({ text: 'Escolha.', simulated: false, reads: [], recurrenceChoice: choice }).success).toBe(true);
    expect(gikaInterpretationSchema.safeParse({ text: 'Escolha.', simulated: false, reads: [], recurrenceChoice: choice, recurrenceConfirmation: confirmation }).success).toBe(false);
  });
});
