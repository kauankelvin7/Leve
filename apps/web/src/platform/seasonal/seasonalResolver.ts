import { Temporal } from '@js-temporal/polyfill';
import { activeSeasonalPeriods, type SeasonalPeriod, type SeasonalSurface } from './seasonalEvents';

export type SeasonalPresentationMode = 'off' | 'static' | 'animated';

const EVENT_PRIORITY = ['new-year', 'christmas', 'easter', 'festa-junina', 'halloween'] as const;

export function seasonalPresentationMode(
  enabled: boolean,
  profileReduceMotion: boolean,
  prefersReducedMotion: boolean,
): SeasonalPresentationMode {
  if (!enabled) return 'off';
  return profileReduceMotion || prefersReducedMotion ? 'static' : 'animated';
}

export function civilDateInTimeZone(timeZone: string): string {
  try {
    return Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate().toString();
  } catch {
    return Temporal.Now.zonedDateTimeISO('UTC').toPlainDate().toString();
  }
}

export function seasonalSurfaceForPath(pathname: string): SeasonalSurface {
  if (pathname === '/hoje' || pathname.startsWith('/hoje/')) return 'today';
  if (pathname === '/calendario' || pathname.startsWith('/calendario/')) return 'calendar';
  return 'global';
}

export function activeSeasonalPeriod(civilDate: string, surface: SeasonalSurface): SeasonalPeriod | null {
  const periods = activeSeasonalPeriods(civilDate)
    .filter(period => period.surfaces.includes(surface) || period.surfaces.includes('global'))
    .sort((left, right) => {
      const leftPriority = EVENT_PRIORITY.indexOf(left.eventId as typeof EVENT_PRIORITY[number]);
      const rightPriority = EVENT_PRIORITY.indexOf(right.eventId as typeof EVENT_PRIORITY[number]);
      return (leftPriority < 0 ? EVENT_PRIORITY.length : leftPriority) - (rightPriority < 0 ? EVENT_PRIORITY.length : rightPriority);
    });
  return periods[0] ?? null;
}