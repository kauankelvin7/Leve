import { describe, expect, it } from 'vitest';
import { OUTBOX_RECONCILIATION_AFTER_MS, requiresOutboxReconciliation } from '../../apps/web/src/platform/outboxPolicy';
import { outboxRecoveryText } from '../../apps/web/src/platform/outboxRecovery';

describe('política de reconciliação da outbox', () => {
  it('exige consulta ao recibo antes de reenviar uma operação com mais de 72 horas', () => {
    const now = Date.parse('2026-09-12T12:00:00.000Z');
    expect(requiresOutboxReconciliation(new Date(now - OUTBOX_RECONCILIATION_AFTER_MS).toISOString(), now)).toBe(false);
    expect(requiresOutboxReconciliation(new Date(now - OUTBOX_RECONCILIATION_AFTER_MS - 1).toISOString(), now)).toBe(true);
  });
});

describe('recuperação legível de conteúdo da outbox', () => {
  it('mostra conteúdo reconhecido e oculta IDs e metadados de transporte', () => {
    const text = outboxRecoveryText({
      command: 'note.update', operationId: 'operation-private', entityId: 'entity-private', expectedRevision: 4,
      payload: {
        title: 'Minha nota', bodyDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto para recuperar' }] }] },
        fcmToken: 'credential-private', signature: 'signature-private', arbitrary: 'unknown-private',
      },
    } as never);
    expect(text).toContain('Editar nota');
    expect(text).toContain('Minha nota');
    expect(text).toContain('Texto para recuperar');
    for (const secret of ['operation-private', 'entity-private', 'credential-private', 'signature-private', 'unknown-private']) expect(text).not.toContain(secret);
  });
});

describe('GOAL-01 original operation age', () => {
  it('reconciles an old original command even if it was queued recently', () => {
    const now = Date.parse('2026-10-14T12:00:00.000Z');
    expect(requiresOutboxReconciliation(new Date(now).toISOString(), now, '2026-10-01T12:00:00.000Z')).toBe(true);
  });
  it('retains malformed age metadata for receipt reconciliation instead of blind replay', () => {
    expect(requiresOutboxReconciliation('invalid')).toBe(true);
  });
});
