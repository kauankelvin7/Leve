export const OUTBOX_RECONCILIATION_AFTER_MS = 72 * 60 * 60 * 1000;

export function requiresOutboxReconciliation(createdAt: string, now = Date.now()) {
  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs) && now - createdAtMs > OUTBOX_RECONCILIATION_AFTER_MS;
}
