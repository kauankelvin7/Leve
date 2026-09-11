import { describe, expect, it } from 'vitest';
import { addDays, todayCivil, validCivil, weekDays } from '../../apps/web/src/features/demo/dates';

describe('Datas civis da demonstração', () => {
  it('respeita o fuso na virada do dia', () => {
    const instant = new Date('2026-09-12T01:00:00Z');
    expect(todayCivil(instant, 'America/Sao_Paulo')).toBe('2026-09-11');
    expect(todayCivil(instant, 'Asia/Tokyo')).toBe('2026-09-12');
  });
  it('rejeita datas inexistentes e parâmetros malformados', () => {
    for (const input of ['2026-02-29', '2026-13-01', '2026-04-31', 'texto', '2026-9-1']) expect(validCivil(input)).toBe(false);
    expect(validCivil('2028-02-29')).toBe(true);
  });
  it('atravessa mês, ano e DST sem somar milissegundos de um dia local', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(weekDays('2026-09-13')).toEqual(['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
  });
});
