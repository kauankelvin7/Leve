import { Temporal } from '@js-temporal/polyfill';
import { readCallSchema, type ReadCall } from '../../packages/domain/src/gika.ts';
import { GikaFault, type ModelCall, type ModelContext } from './model.ts';
export function validateCalls(calls: ModelCall[]): ReadCall[] {
  if (calls.length > 3) throw new GikaFault('GIKA_POLICY');
  return calls.map(call => {
    const parsed = readCallSchema.safeParse(call);
    if (!parsed.success) throw new GikaFault('GIKA_MALFORMED_CALL');
    return parsed.data;
  });
}
export function readRange(call: ReadCall, context: ModelContext) {
  const day = Temporal.PlainDate.from(call.name === 'get_today' ? context.today : call.args.date);
  const start = call.name === 'get_week' ? day.subtract({ days: (day.dayOfWeek % 7 - context.weekStartsOn + 7) % 7 }) : day;
  const end = call.name === 'get_week' ? start.add({ days: 6 }) : start;
  // Narrow civil-date policy: no huge/far-future scans, even through valid schema.
  const distance = Math.abs(Temporal.PlainDate.from(context.today).until(start).days);
  if (distance > 366) throw new GikaFault('GIKA_POLICY');
  return { startDate: start.toString(), endDate: end.toString(), timeZone: context.timeZone };
}

/** In-memory instance limits only; no domain writes or global quota claims. */
export function createReadLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, { day: string; total: number; minute: number; count: number; busy: boolean }>();
  let globalDay = ''; let globalCount = 0;
  return (uid: string) => {
    const instant = now(); const day = new Date(instant).toISOString().slice(0, 10); const minute = Math.floor(instant / 60_000);
    if (day !== globalDay) { globalDay = day; globalCount = 0; for (const [key, bucket] of buckets) if (!bucket.busy) buckets.delete(key); }
    let bucket = buckets.get(uid);
    if (!bucket) {
      if (buckets.size >= 5000) throw new GikaFault('GIKA_QUOTA');
      bucket = { day, total: 0, minute, count: 0, busy: false }; buckets.set(uid, bucket);
    }
    if (bucket.day !== day) { bucket.day = day; bucket.total = 0; }
    if (bucket.minute !== minute) { bucket.minute = minute; bucket.count = 0; }
    if (bucket.busy || bucket.total >= 10 || bucket.count >= 3 || globalCount >= 120) throw new GikaFault('GIKA_QUOTA');
    bucket.busy = true; bucket.total++; bucket.count++; globalCount++;
    return () => { bucket.busy = false; };
  };
}
