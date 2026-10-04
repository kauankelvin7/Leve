import { describe, expect, it } from 'vitest';
import { batchEnvelope, batchOperationId, batchPlanSchema } from '../../packages/domain/src/gikaBatch';
import { createConfirmationSigner } from '../../server/gika/confirmation';
const request = { requestId: 'cb7d6c60-6a10-4b05-bbeb-f9d9faee302b', text: 'Conclui as tarefas de hoje só estas ocorrências' };
const uid = 'signer-test-user';
async function fixture() {
  let now = 1000;
  const signer = createConfirmationSigner(new Uint8Array(32).fill(11), () => now);
  const plan = batchPlanSchema.parse({ action: 'complete', sourceDate: '2026-10-01', items: await Promise.all([0, 1].map(async index => ({ operationId: await batchOperationId(uid, request.requestId, index), id: `task-${index}`, title: `Tarefa ${index}`, revision: 1, timeZone: 'America/Sao_Paulo', before: { dueDate: '2026-10-01', dueTime: null }, patch: { status: 'completed' }, scope: 'occurrence', recurrence: { seriesId: 'series', occurrenceKey: '2026-10-01', seriesHash: 'a'.repeat(64), targetHash: 'b'.repeat(64), futureHash: null, futureAllowed: false, futureCount: 0 } }))) });
  const confirmation = signer.issueBatchConfirmation(uid, request, plan);
  return { signer, confirmation, command: await batchEnvelope(confirmation, request, 0), clock: (value: number) => { now = value; } };
}
describe('M5-T4 complete confirmation binding / scope and cardinality', () => {
  it('valid contract verifies the exact ordered software-owned plan', async () => {
    const f = await fixture(); expect(f.signer.verifyBatchConfirmation(uid, f.command)).toEqual(f.confirmation);
  });
  it.each(['uid', 'request', 'hash', 'action', 'targets', 'cardinality', 'order', 'revision', 'patch', 'scope', 'snapshot', 'purpose', 'expiry'] as const)('changing encoded %s without authority rejects instead of expanding the confirmed effect', async variant => {
    const f = await fixture(), [encoded, signature] = f.confirmation.token.split('.') as [string, string];
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (variant === 'uid') claims.uid = 'neighbor';
    else if (variant === 'request') claims.requestId = crypto.randomUUID();
    else if (variant === 'hash') claims.requestTextHash = '0'.repeat(64);
    else if (variant === 'action') claims.plan.action = 'reschedule';
    else if (variant === 'targets') claims.plan.items[0].id = 'neighbor-task';
    else if (variant === 'cardinality') claims.plan.items.push({ ...claims.plan.items[0], id: 'extra', operationId: crypto.randomUUID() });
    else if (variant === 'order') claims.plan.items.reverse();
    else if (variant === 'revision') claims.plan.items[0].revision = 99;
    else if (variant === 'patch') claims.plan.items[0].patch = { status: 'pending' };
    else if (variant === 'scope') claims.plan.items[0].scope = 'future';
    else if (variant === 'snapshot') claims.plan.items[0].recurrence.seriesHash = '0'.repeat(64);
    else if (variant === 'purpose') claims.purpose = 'recurrence_confirmation';
    else claims.expiresAt += 900000;
    const token = `${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`;
    expect(() => f.signer.verifyBatchConfirmation(uid, { ...f.command, gikaBatch: { ...f.command.gikaBatch!, confirmationToken: token } })).toThrow('Não consegui validar');
  });
  it('captured valid contract cannot cross UID, request hash, operation or command identity', async () => {
    const f = await fixture();
    expect(() => f.signer.verifyBatchConfirmation('neighbor', f.command)).toThrow();
    for (const command of [{ ...f.command, operationId: crypto.randomUUID() }, { ...f.command, command: 'activity.updateFuture' }, { ...f.command, expectedRevision: 2 }, { ...f.command, gikaBatch: { ...f.command.gikaBatch!, requestId: crypto.randomUUID() } }, { ...f.command, gikaBatch: { ...f.command.gikaBatch!, requestTextHash: '0'.repeat(64) } }]) expect(() => f.signer.verifyBatchConfirmation(uid, command)).toThrow();
  });
  it('pending effects retain original expiry and key rotation cannot renew authorization', async () => {
    const f = await fixture(); f.clock(1000 + 15 * 60000);
    expect(() => f.signer.verifyBatchConfirmation(uid, f.command)).toThrow('Essa prévia expirou');
    expect(() => createConfirmationSigner(new Uint8Array(32).fill(22), () => 1000).verifyBatchConfirmation(uid, f.command)).toThrow();
  });
  it('known schema index outside this sealed cardinality fails explicitly as invalid confirmation', async () => {
    const f = await fixture();
    expect(() => f.signer.verifyBatchConfirmation(uid, { ...f.command, gikaBatch: { ...f.command.gikaBatch!, index: 4 } })).toThrow('Não consegui validar');
  });
});
