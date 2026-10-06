import { db } from '../platform/firebase.ts';
import { GikaFault } from './model.ts';
import { parseGikaDailyLimit, parseGikaMinuteLimit } from './quotaPolicy.ts';
export { parseGikaDailyLimit } from './quotaPolicy.ts';

const MAX_STORED_RESERVATIONS = 6;
const SHORT_BURST = 3;
const RECOVERY_MINUTE_LIMIT = 60;
const RECOVERY_DAILY_LIMIT = 600;
const RECOVERY_BURST_LIMIT = 12;

type RecoveryWindow = { minuteStartedAt: number; minuteCount: number; burstStartedAt: number; burstCount: number; dayKey: string; dayCount: number };

/** Durable, rolling per-account quota. Reserve immediately before each upstream call. */
export async function consumeGikaQuota(uid: string, now = Date.now(), dailyLimit = parseGikaDailyLimit(), minuteLimit = parseGikaMinuteLimit()) {
  const instant = new Date(now);
  const day = instant.toISOString().slice(0, 10);
  const quotaRef = db.doc(`usageBuckets/${uid}_gika`);
  await db.runTransaction(async transaction => {
    const quota = await transaction.get(quotaRef);
    const data = quota.data();
    const storedTimes = data?.gikaRequestTimesMs ?? [];
    if (!Array.isArray(storedTimes) || storedTimes.length > MAX_STORED_RESERVATIONS || storedTimes.some(timestamp => !Number.isSafeInteger(timestamp))) throw new GikaFault('GIKA_UNAVAILABLE', 'QuotaStateInvalid');
    const recentTimes = (storedTimes as number[]).filter(timestamp => timestamp > now - 60_000);
    const dailyCount = data?.gikaDayKey === day ? data.gikaDayCount ?? 0 : 0;
    if (dailyLimit !== null && data?.gikaDayKey === day && (!Number.isSafeInteger(dailyCount) || dailyCount < 0)) throw new GikaFault('GIKA_UNAVAILABLE', 'QuotaStateInvalid');
    if (recentTimes.length >= minuteLimit || recentTimes.filter(timestamp => timestamp > now - 10_000).length >= SHORT_BURST || (dailyLimit !== null && dailyCount >= dailyLimit)) throw new GikaFault('GIKA_QUOTA');
    transaction.set(quotaRef, {
      gikaRequestTimesMs: [...recentTimes, now],
      ...(dailyLimit === null ? {} : { gikaDayKey: day, gikaDayCount: dailyCount + 1 }),
    }, { merge: true });
  });
}

/**
 * Receipt recovery never calls the model and must not spend the durable model
 * quota. It still needs a cheap per-process guard because the endpoint reads
 * account-scoped Firestore receipts. The edge rate limit remains the global
 * control for multi-instance deployments.
 */
export function createGikaRecoveryQuota() {
  const recoveryWindows = new Map<string, RecoveryWindow>();
  return function consumeGikaRecoveryQuota(uid: string, now = Date.now()) {
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const current = recoveryWindows.get(uid);
    const window: RecoveryWindow = current && now - current.minuteStartedAt < 60_000
      ? current
      : { minuteStartedAt: now, minuteCount: 0, burstStartedAt: now, burstCount: 0, dayKey, dayCount: current?.dayKey === dayKey ? current.dayCount : 0 };
    if (now - window.burstStartedAt >= 10_000) {
      window.burstStartedAt = now;
      window.burstCount = 0;
    }
    if (window.dayKey !== dayKey) {
      window.dayKey = dayKey;
      window.dayCount = 0;
    }
    if (window.minuteCount >= RECOVERY_MINUTE_LIMIT || window.burstCount >= RECOVERY_BURST_LIMIT || window.dayCount >= RECOVERY_DAILY_LIMIT) {
      recoveryWindows.set(uid, window);
      throw new GikaFault('GIKA_QUOTA');
    }
    window.minuteCount += 1;
    window.burstCount += 1;
    window.dayCount += 1;
    recoveryWindows.set(uid, window);
    if (recoveryWindows.size > 10_000) {
      for (const [key, value] of recoveryWindows) {
        if (now - value.minuteStartedAt > 60_000 && value.dayKey !== dayKey) recoveryWindows.delete(key);
        if (recoveryWindows.size <= 9_000) break;
      }
    }
  };
}

export const consumeGikaRecoveryQuota = createGikaRecoveryQuota();
