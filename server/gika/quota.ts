import { db } from '../platform/firebase.ts';
import { GikaFault } from './model.ts';
import { parseGikaDailyLimit } from './quotaPolicy.ts';
export { parseGikaDailyLimit } from './quotaPolicy.ts';

const PER_MINUTE = 3;

/** Durable, rolling per-account burst quota for model-backed interpretation. */
export async function consumeGikaQuota(uid: string, now = Date.now(), dailyLimit = parseGikaDailyLimit()) {
  const instant = new Date(now);
  const day = instant.toISOString().slice(0, 10);
  const quotaRef = db.doc(`usageBuckets/${uid}_gika`);
  await db.runTransaction(async transaction => {
    const quota = await transaction.get(quotaRef);
    const data = quota.data();
    const storedTimes = data?.gikaRequestTimesMs ?? [];
    if (!Array.isArray(storedTimes) || storedTimes.length > PER_MINUTE || storedTimes.some(timestamp => !Number.isSafeInteger(timestamp))) throw new GikaFault('GIKA_UNAVAILABLE', 'QuotaStateInvalid');
    const recentTimes = (storedTimes as number[]).filter(timestamp => timestamp > now - 60_000);
    const dailyCount = data?.gikaDayKey === day ? data.gikaDayCount ?? 0 : 0;
    if (dailyLimit !== null && data?.gikaDayKey === day && (!Number.isSafeInteger(dailyCount) || dailyCount < 0)) throw new GikaFault('GIKA_UNAVAILABLE', 'QuotaStateInvalid');
    if (recentTimes.length >= PER_MINUTE || (dailyLimit !== null && dailyCount >= dailyLimit)) throw new GikaFault('GIKA_QUOTA');
    transaction.set(quotaRef, {
      gikaRequestTimesMs: [...recentTimes, now],
      ...(dailyLimit === null ? {} : { gikaDayKey: day, gikaDayCount: dailyCount + 1 }),
    }, { merge: true });
  });
}
