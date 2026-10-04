import { describe, it, expect, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { gikaConfirmationSchema, reschedulePreview } from '../../packages/domain/src/gikaConfirmation';
import { rescheduleEnvelope } from '../../packages/domain/src/gikaReschedule';
import { createConfirmationSigner, issueConfirmation } from '../../server/gika/confirmation';
const task = { id: 'task', title: 'Academia', dueDate: '2026-10-01', dueTime: '19:00', timeZone: 'America/Sao_Paulo', revision: 1, patch: { dueDate: '2026-10-02' } };
const req = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'Move Academia para amanhã' };
const policy = { kind: 'confirm', risk: 'low', reason: 'RESCHEDULE_PREVIEW_REQUIRED' };
describe('M5-T2 strict server-derived confirmation contract', () => {
  it('confirm produces structured before/patch/after; allow/clarify/deny never executable', () => {
    const preview = reschedulePreview(task, policy);
    expect(preview.summary).toEqual({ before: { dueDate: task.dueDate, dueTime: '19:00' }, after: { dueDate: task.patch.dueDate, dueTime: '19:00' }, changedFields: ['dueDate'] });
    for (const kind of ['allow', 'clarify', 'deny']) expect(() => reschedulePreview(task, { ...policy, kind })).toThrow();
    expect(() => reschedulePreview({ ...task, patch: { dueDate: task.dueDate } }, policy)).toThrow();
  });
  it('time-only difference is explicit; date-only never invents a time', () => {
    expect(reschedulePreview({ ...task, patch: { dueDate: task.dueDate, dueTime: '20:00' } }, policy).summary.changedFields).toEqual(['dueTime']);
    expect(reschedulePreview({ ...task, dueTime: null }, policy).summary.after.dueTime).toBeNull();
  });
  it('tampered summary/unknown fields/action/confirmed text are rejected', () => {
    const preview = reschedulePreview(task, policy), signer = createConfirmationSigner(randomBytes(32));
    const c = signer.issue('uid-a', req, task, policy);
    for (const value of [{ ...c, confirmed: true }, { ...c, action: { ...c.action, kind: 'batch' } }, { ...c, summary: { ...preview.summary, after: { ...preview.summary.after, dueTime: '20:00' } } }]) expect(gikaConfirmationSchema.safeParse(value).success).toBe(false);
  });
  it('sealed target/patch/revision/operation/text hash/UID cannot be changed', async () => {
    const signer = createConfirmationSigner(randomBytes(32)), c = signer.issue('uid-a', req, task, policy);
    const command = await rescheduleEnvelope(task, req, c.token);
    expect(signer.verify('uid-a', command)).toEqual(c);
    for (const value of [{ ...command, entityId: 'other' }, { ...command, expectedRevision: 2 }, { ...command, operationId: crypto.randomUUID() }, { ...command, payload: { dueDate: '2026-10-03' } }, { ...command, gikaReschedule: { ...command.gikaReschedule!, requestTextHash: 'a'.repeat(64) } }, { ...command, gikaReschedule: { requestTextHash: command.gikaReschedule!.requestTextHash } }]) expect(() => signer.verify('uid-a', value)).toThrow();
    expect(() => signer.verify('uid-b', command)).toThrow();
  });
  it('signature covers expiration/claims and expires without silent renewal', async () => {
    let now = 1_000_000; const signer = createConfirmationSigner(randomBytes(32), () => now), c = signer.issue('uid-a', req, task, policy);
    const command = await rescheduleEnvelope(task, req, c.token), [body, signature] = c.token.split('.');
    const claims = JSON.parse(Buffer.from(body!, 'base64url').toString()); claims.uid = 'uid-b'; claims.expiresAt += 10_000;
    expect(() => signer.verify('uid-b', { ...command, gikaReschedule: { ...command.gikaReschedule!, confirmationToken: `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}` } })).toThrow();
    now += 15 * 60_000; expect(() => signer.verify('uid-a', command)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_EXPIRED' }));
    expect(() => createConfirmationSigner(randomBytes(32)).verify('uid-a', command)).toThrow();
  });
  it('production without server signing configuration fails only confirmation; no fixed fallback key', () => {
    vi.stubEnv('SCHEDULER_HMAC_SECRET', ''); vi.stubEnv('NODE_ENV', 'production');
    try { expect(() => issueConfirmation('uid-a', req, task, policy)).toThrowError(expect.objectContaining({ code: 'GIKA_CONFIRMATION_UNAVAILABLE' })); } finally { vi.unstubAllEnvs(); }
  });
});
