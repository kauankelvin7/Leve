import { describe, expect, it } from 'vitest';
import { readResultSchema, gikaResponseSchema } from '../../packages/domain/src/gika';
import { readRange, validateCalls } from '../../server/gika/policy';
import { parseGikaDailyLimit, parseGikaMinuteLimit } from '../../server/gika/quotaPolicy';
const context = { today: '2026-09-30', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
describe('Gika allowlist e policy somente leitura', () => {
  it.each(['activity.create', 'complete_task', 'reschedule_task', 'delete_task', 'get_other_user', '__proto__'])('nega %s', name => {
    expect(() => validateCalls([{ name, args: {} }])).toThrow('GIKA_MALFORMED_CALL');
  });
  it('nega uid/path, datas inexistentes e call extra antes de ler', () => {
    for (const args of [{ date: '2026-02-30' }, { date: '2026-10-01', uid: 'other' }, { date: '2026-10-01', path: 'users/other' }]) {
      expect(() => validateCalls([{ name: 'get_day', args }])).toThrow();
    }
    expect(() => validateCalls(Array.from({ length: 4 }, () => ({ name: 'get_today', args: {} })))).toThrow('GIKA_POLICY');
  });
  it('E01/E02: hoje/amanhã civil e semana contém data, até sete dias', () => {
    expect(readRange({ name: 'get_today', args: {} }, context)).toMatchObject({ startDate: '2026-09-30', endDate: '2026-09-30' });
    expect(readRange({ name: 'get_day', args: { date: '2026-10-02' } }, context)).toMatchObject({ startDate: '2026-10-02', endDate: '2026-10-02' });
    expect(readRange({ name: 'get_week', args: { date: '2026-10-01' } }, context)).toMatchObject({ startDate: '2026-09-28', endDate: '2026-10-04' });
    expect(readRange({ name: 'get_week', args: { date: '2026-10-01' } }, { ...context, weekStartsOn: 0 })).toMatchObject({ startDate: '2026-09-27', endDate: '2026-10-03' });
    expect(() => readRange({ name: 'get_day', args: { date: '2099-01-01' } }, context)).toThrow('GIKA_POLICY');
  });
  it('saídas não aceitam mutação, preview real, cache, itens duplicados ou >7 dias', () => {
    const read = { startDate: '2026-09-30', endDate: '2026-09-30', timeZone: context.timeZone, partial: false, cached: false, items: [] };
    expect(readResultSchema.safeParse(read).success).toBe(true);
    for (const change of [{ endDate: '2026-10-07' }, { cached: true }, { command: 'activity.create' }]) expect(readResultSchema.safeParse({ ...read, ...change }).success).toBe(false);
    expect(gikaResponseSchema.safeParse({ text: 'ok', simulated: false, reads: [read], preview: 'organize-demo' }).success).toBe(false);
  });
  it('daily quota is optional and only accepts an explicit positive safe integer', () => {
    expect(parseGikaDailyLimit(undefined)).toBeNull();
    expect(parseGikaDailyLimit('')).toBeNull();
    expect(parseGikaDailyLimit('25')).toBe(25);
    for (const invalid of ['0', '-1', '1.5', 'abc', '9007199254740992']) expect(() => parseGikaDailyLimit(invalid)).toThrow('Invalid GIKA_DAILY_LIMIT');
  });
  it('minute budget is explicit, bounded to the previous maximum upstream envelope, and fail-closed', () => {
    expect(parseGikaMinuteLimit('')).toBe(6);
    expect(parseGikaMinuteLimit('3')).toBe(3);
    for (const value of ['0', '7', '-1', '2.5', 'unlimited']) expect(() => parseGikaMinuteLimit(value)).toThrow('Invalid GIKA_MINUTE_LIMIT');
  });

});
