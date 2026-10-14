import { db } from '../platform/firebase.ts';
import { GikaFault } from './model.ts';
import { parseGikaDailyLimit, parseGikaMinuteLimit } from './quotaPolicy.ts';
export { parseGikaDailyLimit } from './quotaPolicy.ts';

const MAX_STORED_RESERVATIONS = 6;
const SHORT_BURST = 3;
const RECOVERY_MINUTE_LIMIT = 60;
const RECOVERY_DAILY_LIMIT = 600;
const RECOVERY_BURST_LIMIT = 12;

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
 * quota. A separate stable account bucket protects receipt reads across router
 * instances and process restarts. No request text or receipt is stored here.
 */
export function createGikaRecoveryQuota() {
  return async function consumeGikaRecoveryQuota(uid: string, now = Date.now()) {
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const quotaRef = db.doc(`usageBuckets/${uid}_gika_recovery`);
    await db.runTransaction(async transaction => {
      const quota = await transaction.get(quotaRef);
      const data = quota.data();
      const storedTimes = data?.requestTimesMs === undefined ? [] : data.requestTimesMs;
      if (!Array.isArray(storedTimes) || storedTimes.length > RECOVERY_MINUTE_LIMIT || storedTimes.some(timestamp => !Number.isSafeInteger(timestamp) || timestamp < 0)
        || (data && (typeof data.dayKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.dayKey) || !Number.isSafeInteger(data.dayCount) || data.dayCount < 0 || data.dayCount > RECOVERY_DAILY_LIMIT))) {
        throw new GikaFault('GIKA_UNAVAILABLE', 'QuotaStateInvalid');
      }
      const recentTimes = (storedTimes as number[]).filter(timestamp => timestamp > now - 60_000);
      const dailyCount = data?.dayKey === dayKey ? data.dayCount as number : 0;
      if (recentTimes.length >= RECOVERY_MINUTE_LIMIT || recentTimes.filter(timestamp => timestamp > now - 10_000).length >= RECOVERY_BURST_LIMIT || dailyCount >= RECOVERY_DAILY_LIMIT) throw new GikaFault('GIKA_QUOTA');
      transaction.set(quotaRef, { requestTimesMs: [...recentTimes, now], dayKey, dayCount: dailyCount + 1 });
    });
  };
}

export const consumeGikaRecoveryQuota = createGikaRecoveryQuota();
