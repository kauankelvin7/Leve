import { describe, expect, it } from 'vitest';
import { readResultSchema, gikaResponseSchema } from '../../packages/domain/src/gika';
import { createReadLimiter, readRange, validateCalls } from '../../server/gika/policy';
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
  it('limite por conta, single flight e reset UTC sem writes', () => {
    let now = Date.UTC(2026, 8, 30); const acquire = createReadLimiter(() => now);
    const release = acquire('a'); expect(() => acquire('a')).toThrow('GIKA_QUOTA'); release();
    acquire('a')(); acquire('a')(); expect(() => acquire('a')).toThrow('GIKA_QUOTA');
    acquire('b')();
    for (let count = 3; count < 10; count++) { now += 60_000; acquire('a')(); }
    now += 60_000; expect(() => acquire('a')).toThrow('GIKA_QUOTA');
    now += 86_400_000; expect(acquire('a')).toBeTypeOf('function');
  });
});
