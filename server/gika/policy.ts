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
