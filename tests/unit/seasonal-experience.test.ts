import { describe, expect, it } from 'vitest';
import { activeSeasonalPeriod, seasonalPresentationMode, seasonalSurfaceForPath } from '../../apps/web/src/platform/seasonal/seasonalResolver';
import { seasonalEvents } from '../../apps/web/src/platform/seasonal/seasonalEvents';
import { seasonalCalendarMarkerForDate, seasonalCalendarMarkersForYear } from '../../apps/web/src/platform/seasonal/seasonalCalendarMarkers';
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

  it('resolves the approved events on the primary surfaces', () => {
    expect(activeSeasonalPeriod('2026-12-24', 'today')?.eventId).toBe('christmas');
    expect(activeSeasonalPeriod('2026-06-20', 'login')?.eventId).toBe('festa-junina');
    expect(activeSeasonalPeriod('2026-06-20', 'calendar')?.eventId).toBe('festa-junina');
  });

  it('keeps Easter abstract in the registry', () => {
    const easter = seasonalEvents.find(event => event.id === 'easter');
    expect(easter?.intro).toBe('easter-paper');
    expect(easter?.intro).not.toMatch(/bunny|rabbit|coelho/i);
  });

  it('prioritizes New Year during the cross-year overlap', () => {
    expect(activeSeasonalPeriod('2026-12-31', 'today')?.eventId).toBe('new-year');
    expect(activeSeasonalPeriod('2027-01-01', 'calendar')?.eventId).toBe('new-year');
  });

  it('marks only the approved calendar anchor dates', () => {
    expect(seasonalCalendarMarkersForYear(2026)).toEqual([
      { eventId: 'new-year', label: 'Ano-Novo', date: '2026-01-01' },
      { eventId: 'easter', label: 'Páscoa', date: '2026-04-05' },
      { eventId: 'festa-junina', label: 'Festa Junina', date: '2026-06-24' },
      { eventId: 'halloween', label: 'Halloween', date: '2026-10-31' },
      { eventId: 'christmas', label: 'Natal', date: '2026-12-25' },
      { eventId: 'new-year', label: 'Ano-Novo', date: '2026-12-31' },
    ]);
    expect(seasonalCalendarMarkerForDate('2026-12-24')).toBeNull();
    expect(seasonalCalendarMarkerForDate('2026-12-25')?.eventId).toBe('christmas');
    expect(seasonalCalendarMarkerForDate('2026-06-24')?.eventId).toBe('festa-junina');
    expect(seasonalCalendarMarkerForDate('2026-10-31')?.eventId).toBe('halloween');
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
