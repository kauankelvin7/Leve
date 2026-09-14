import { describe, expect, it } from 'vitest';
import { OUTBOX_RECONCILIATION_AFTER_MS, requiresOutboxReconciliation } from '../../apps/web/src/platform/outboxPolicy';

describe('política de reconciliação da outbox', () => {
  it('exige consulta ao recibo antes de reenviar uma operação com mais de 72 horas', () => {
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    expect(requiresOutboxReconciliation(new Date(now - OUTBOX_RECONCILIATION_AFTER_MS).toISOString(), now)).toBe(false);
    expect(requiresOutboxReconciliation(new Date(now - OUTBOX_RECONCILIATION_AFTER_MS - 1).toISOString(), now)).toBe(true);
  });
});
