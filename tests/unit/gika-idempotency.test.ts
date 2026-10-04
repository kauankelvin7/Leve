import { describe, expect, it } from 'vitest';
import { createTaskEnvelope } from '../../apps/web/src/features/gika/commandBridge';
import { validateToolCalls } from '../../server/gika/createPolicy';
const task = { title: 'Academia', dueDate: '2026-10-02', dueTime: null, timeZone: 'America/Sao_Paulo' };
const request = { requestId: '3dad14e9-a25a-48a3-a5ab-d05d277c3991', text: 'Academia amanhã' };
describe('M3-T2 software operation identity, never content/model identity', () => {
  it('reconstruction after response loss produces the exact same envelope, without volatile timestamp', async () => {
    const first = await createTaskEnvelope(task, request);
    const second = await createTaskEnvelope(task, request);
    expect(first).toEqual(second);
    expect(first.operationId).toBe(request.requestId); expect(first.entityId).toBe(request.requestId);
    expect(first).not.toHaveProperty('clientCreatedAt');
    expect(first.gika?.requestTextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toContain(request.text);
  });
  it('new intentional request with identical content gets a different operation/entity', async () => {
    const first = await createTaskEnvelope(task, request);
    const second = await createTaskEnvelope(task, { ...request, requestId: crypto.randomUUID() });
    expect(second.operationId).not.toBe(first.operationId); expect(second.entityId).not.toBe(first.entityId);
  });
  it('same identity with altered user request changes its bound envelope', async () => {
    const first = await createTaskEnvelope(task, request);
    const changed = await createTaskEnvelope(task, { ...request, text: 'Cria Academia amanhã' });
    expect(changed.operationId).toBe(first.operationId); expect(changed.gika).not.toEqual(first.gika);
  });
  it('identical strict function calls collapse to one operation; distinct or forged calls remain denied', () => {
    const call = { name: 'create_task', args: { title: task.title, dueDate: task.dueDate, dueTime: null } };
    expect(validateToolCalls([call, { ...call, args: { dueTime: null, dueDate: task.dueDate, title: task.title } }])).toEqual([call]);
    expect(() => validateToolCalls([call, { ...call, args: { ...call.args, title: 'Java' } }])).toThrow('GIKA_POLICY');
    expect(() => validateToolCalls([call, { ...call, args: { ...call.args, requestId: request.requestId } }])).toThrow('GIKA_MALFORMED_CALL');
  });
});
