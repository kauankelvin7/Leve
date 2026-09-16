import { describe, expect, it } from 'vitest';
import { activeSeasonalPeriods, easterSunday, seasonalSeenStorageKey } from '../../apps/web/src/platform/seasonal/seasonalEvents';

describe('seasonal event registry', () => {
  it('calculates Gregorian Easter deterministically without external services', () => {
    expect(easterSunday(2026).toString()).toBe('2026-04-05');
    expect(easterSunday(2027).toString()).toBe('2027-03-28');
    expect(() => easterSunday(1500)).toThrow(RangeError);
  });

  it('activates Easter from Good Friday through Easter Sunday', () => {
    expect(activeSeasonalPeriods('2026-04-02').some(period => period.eventId === 'easter')).toBe(false);
    expect(activeSeasonalPeriods('2026-04-03').some(period => period.eventId === 'easter')).toBe(true);
    expect(activeSeasonalPeriods('2026-04-05').some(period => period.eventId === 'easter')).toBe(true);
    expect(activeSeasonalPeriods('2026-04-06').some(period => period.eventId === 'easter')).toBe(false);
  });

  it('keeps Christmas inside its configured product period', () => {
    expect(activeSeasonalPeriods('2026-12-19').some(period => period.eventId === 'christmas')).toBe(false);
    expect(activeSeasonalPeriods('2026-12-20').some(period => period.eventId === 'christmas')).toBe(true);
    expect(activeSeasonalPeriods('2026-12-25').some(period => period.eventId === 'christmas')).toBe(true);
    expect(activeSeasonalPeriods('2026-12-26').some(period => period.eventId === 'christmas')).toBe(false);
  });

  it('resolves New Year consistently across the civil-year boundary', () => {
    const december = activeSeasonalPeriods('2026-12-31').find(period => period.eventId === 'new-year');
    const january = activeSeasonalPeriods('2027-01-01').find(period => period.eventId === 'new-year');
    expect(december?.periodId).toBe('new-year-2026-2027');
    expect(january?.periodId).toBe(december?.periodId);
    expect(activeSeasonalPeriods('2027-01-02').some(period => period.eventId === 'new-year')).toBe(false);
  });

  it('covers Festa Junina and Halloween only in their configured periods', () => {
    expect(activeSeasonalPeriods('2026-06-12').some(period => period.eventId === 'festa-junina')).toBe(true);
    expect(activeSeasonalPeriods('2026-06-30').some(period => period.eventId === 'festa-junina')).toBe(true);
    expect(activeSeasonalPeriods('2026-07-01').some(period => period.eventId === 'festa-junina')).toBe(false);
    expect(activeSeasonalPeriods('2026-10-29').some(period => period.eventId === 'halloween')).toBe(true);
    expect(activeSeasonalPeriods('2026-10-31').some(period => period.eventId === 'halloween')).toBe(true);
    expect(activeSeasonalPeriods('2026-11-01').some(period => period.eventId === 'halloween')).toBe(false);
  });

  it('creates a stable device-local key without account data', () => {
    expect(seasonalSeenStorageKey({ eventId: 'christmas', periodId: 'christmas-2026' })).toBe('leve.seasonal.seen.christmas.christmas-2026');
  });
});
