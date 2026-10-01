import type { DecodedIdToken } from 'firebase-admin/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock('../../server/platform/firebase.ts', () => ({ db: { doc: () => ({ collection: () => ({ doc: () => ({}) }) }), runTransaction: fixture.transaction } }));
import { contentCommand } from '../../server/commands/content';
import { createTaskEnvelope } from '../../apps/web/src/features/gika/commandBridge';
const identity = { uid: 'account-a', email_verified: true } as DecodedIdToken;
const task = { title: 'Academia', dueDate: '2026-10-02', dueTime: null, timeZone: 'America/Sao_Paulo' };
beforeEach(() => { fixture.transaction.mockReset(); fixture.transaction.mockRejectedValue(new Error('TRANSACTION_REACHED')); });
describe('M3-T2 receipts can reconstruct every accepted Gika envelope', () => {
  it('noncanonical trimmed/defaulted payload cannot enter persistence with a different receipt hash', async () => {
    const command = await createTaskEnvelope(task, { requestId: crypto.randomUUID(), text: 'Academia amanhã' });
    const payload = command.payload as { title: string; schedule: Record<string, unknown> };
    for (const changed of [{ ...payload, title: ' Academia ' }, { ...payload, schedule: Object.fromEntries(Object.entries(payload.schedule).filter(([key]) => key !== 'disambiguation')) }]) {
      await expect(contentCommand(identity, { ...command, payload: changed })).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    }
    expect(fixture.transaction).not.toHaveBeenCalled();
  });
});
