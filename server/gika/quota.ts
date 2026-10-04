import { db } from '../platform/firebase.ts';
import { GikaFault } from './model.ts';

const PER_MINUTE = 3;
const PER_DAY = 10;

/** Durable per-account budget for model-backed interpretation across serverless instances. */
export async function consumeGikaQuota(uid: string, now = Date.now()) {
  const instant = new Date(now);
  const day = instant.toISOString().slice(0, 10);
  const minute = instant.toISOString().slice(0, 16);
  const dayRef = db.doc(`usageBuckets/${uid}_${day}`);
  await db.runTransaction(async transaction => {
    const daily = await transaction.get(dayRef);
    const data = daily.data();
    const dailyCount = data?.gikaCount ?? 0;
    const minuteCount = data?.gikaMinuteKey === minute ? data.gikaMinuteCount ?? 0 : 0;
    if (dailyCount >= PER_DAY || minuteCount >= PER_MINUTE) throw new GikaFault('GIKA_QUOTA');
    transaction.set(dayRef, { gikaCount: dailyCount + 1, gikaMinuteKey: minute, gikaMinuteCount: minuteCount + 1 }, { merge: true });
  });
}
