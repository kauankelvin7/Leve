export const OUTBOX_RECONCILIATION_AFTER_MS = 72 * 60 * 60 * 1000;

export function requiresOutboxReconciliation(createdAt: string, now = Date.now(), clientCreatedAt?: string) {
  const createdAtMs = Date.parse(createdAt);
  const clientMs = clientCreatedAt === undefined ? createdAtMs : Date.parse(clientCreatedAt);
  return !Number.isFinite(createdAtMs) || !Number.isFinite(clientMs)
    || now - Math.min(createdAtMs, clientMs) > OUTBOX_RECONCILIATION_AFTER_MS;
}
