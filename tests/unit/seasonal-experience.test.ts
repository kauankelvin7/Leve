import { describe, expect, it } from 'vitest';
import { activeSeasonalPeriod, seasonalPresentationMode, seasonalSurfaceForPath } from '../../apps/web/src/platform/seasonal/seasonalResolver';
import { hasSeenSeasonalIntro, markSeasonalIntroSeen, storedSeasonalDetailsEnabled, storeSeasonalDetailsEnabled } from '../../apps/web/src/platform/seasonal/seasonalStorage';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('seasonal experience policy', () => {
  it('turns the experience off before considering motion preferences', () => {
    expect(seasonalPresentationMode(false, false, false)).toBe('off');
    expect(seasonalPresentationMode(true, true, false)).toBe('static');
    expect(seasonalPresentationMode(true, false, true)).toBe('static');
    expect(seasonalPresentationMode(true, false, false)).toBe('animated');
  });

  it('maps routes to the intended seasonal surfaces', () => {
    expect(seasonalSurfaceForPath('/entrar')).toBe('login');
    expect(seasonalSurfaceForPath('/registrar')).toBe('login');
    expect(seasonalSurfaceForPath('/recuperar')).toBe('login');
    expect(seasonalSurfaceForPath('/hoje')).toBe('today');
    expect(seasonalSurfaceForPath('/calendario')).toBe('calendar');
    expect(seasonalSurfaceForPath('/notas')).toBe('global');
  });

  it('resolves only periods relevant to the current surface', () => {
    expect(activeSeasonalPeriod('2026-12-24', 'today')?.eventId).toBe('christmas');
    expect(activeSeasonalPeriod('2026-06-20', 'login')).toBeNull();
    expect(activeSeasonalPeriod('2026-06-20', 'calendar')?.eventId).toBe('festa-junina');
  });

  it('prioritizes New Year during the cross-year overlap', () => {
    expect(activeSeasonalPeriod('2026-12-31', 'today')?.eventId).toBe('new-year');
    expect(activeSeasonalPeriod('2027-01-01', 'calendar')?.eventId).toBe('new-year');
  });

  it('keeps the public device preference enabled by default and stores explicit opt-out', () => {
    const storage = new MemoryStorage();
    expect(storedSeasonalDetailsEnabled(storage)).toBe(true);
    storeSeasonalDetailsEnabled(false, storage);
    expect(storedSeasonalDetailsEnabled(storage)).toBe(false);
    storeSeasonalDetailsEnabled(true, storage);
    expect(storedSeasonalDetailsEnabled(storage)).toBe(true);
  });

  it('marks an intro once per event period without account identifiers', () => {
    const storage = new MemoryStorage();
    const period = { eventId: 'christmas', periodId: 'christmas-2026' };
    expect(hasSeenSeasonalIntro(period, storage)).toBe(false);
    markSeasonalIntroSeen(period, storage);
    expect(hasSeenSeasonalIntro(period, storage)).toBe(true);
  });
});
