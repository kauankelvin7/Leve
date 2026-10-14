import { beforeEach, describe, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ doc: vi.fn((path: string) => ({ path })), runTransaction: vi.fn() }));
vi.mock('../../server/platform/firebase.ts', () => ({ db: database }));
import { createGikaRecoveryQuota } from '../../server/gika/quota';

const stored = new Map<string, Record<string, unknown>>();
const start = Date.UTC(2026, 9, 5, 12);
beforeEach(() => {
  stored.clear();
  vi.clearAllMocks();
  database.runTransaction.mockImplementation(async work => work({
    get: async (ref: { path: string }) => ({ exists: stored.has(ref.path), data: () => stored.get(ref.path) }),
    set: (ref: { path: string }, data: Record<string, unknown>) => { stored.set(ref.path, data); },
  }));
});

describe('durable Gika receipt recovery quota', () => {
  it('fresh consumers share the same per-UID burst without charging the model bucket', async () => {
    const first = createGikaRecoveryQuota(), second = createGikaRecoveryQuota();
    for (let index = 0; index < 12; index++) await (index % 2 ? first : second)('account-a', start);
    await expect(createGikaRecoveryQuota()('account-a', start + 9_999)).rejects.toMatchObject({ code: 'GIKA_QUOTA' });
    await second('account-b', start);
    expect(stored.get('usageBuckets/account-a_gika_recovery')).toMatchObject({ dayCount: 12, requestTimesMs: Array(12).fill(start) });
    expect(stored.has('usageBuckets/account-a_gika')).toBe(false);
    await first('account-a', start + 10_000);
    expect(stored.get('usageBuckets/account-a_gika_recovery')?.dayCount).toBe(13);
  });

  it('enforces rolling minute boundaries and keeps at most 60 recent reservations', async () => {
    const consume = createGikaRecoveryQuota();
    for (let burst = 0; burst < 5; burst++) for (let index = 0; index < 12; index++) await consume('account-a', start + burst * 10_000);
    await expect(consume('account-a', start + 59_999)).rejects.toMatchObject({ code: 'GIKA_QUOTA' });
    await consume('account-a', start + 60_000);
    const bucket = stored.get('usageBuckets/account-a_gika_recovery');
    expect(bucket?.requestTimesMs).toHaveLength(49);
    expect(bucket?.dayCount).toBe(61);
  });

  it('does not reset a rolling burst at UTC midnight but resets the daily cap', async () => {
    const consume = createGikaRecoveryQuota(), midnight = Date.UTC(2026, 9, 6);
    for (let index = 0; index < 12; index++) await consume('account-a', midnight - 1);
    await expect(consume('account-a', midnight)).rejects.toMatchObject({ code: 'GIKA_QUOTA' });
    await consume('account-a', midnight + 10_000);
    expect(stored.get('usageBuckets/account-a_gika_recovery')).toMatchObject({ dayKey: '2026-10-06', dayCount: 1 });
    stored.set('usageBuckets/account-b_gika_recovery', { dayKey: '2026-10-05', dayCount: 599, requestTimesMs: [] });
    await consume('account-b', midnight - 1);
    await expect(consume('account-b', midnight - 1)).rejects.toMatchObject({ code: 'GIKA_QUOTA' });
    await consume('account-b', midnight);
    expect(stored.get('usageBuckets/account-b_gika_recovery')?.dayCount).toBe(1);
  });

  it.each([
    { requestTimesMs: null, dayKey: '2026-10-05', dayCount: 1 },
    { requestTimesMs: ['private invalid value'], dayKey: '2026-10-05', dayCount: 1 },
    { requestTimesMs: Array(61).fill(start), dayKey: '2026-10-05', dayCount: 1 },
    { requestTimesMs: [], dayKey: '2026-10-05', dayCount: -1 },
    { requestTimesMs: [], dayKey: 'invalid', dayCount: 1 },
    { requestTimesMs: [], dayKey: '2026-10-05', dayCount: 601 },
  ])('fails closed without overwriting malformed quota state %j', async data => {
    stored.set('usageBuckets/account-a_gika_recovery', data);
    await expect(createGikaRecoveryQuota()('account-a', start)).rejects.toMatchObject({ code: 'GIKA_UNAVAILABLE', diagnosticClass: 'QuotaStateInvalid' });
    expect(stored.get('usageBuckets/account-a_gika_recovery')).toBe(data);
  });
});
