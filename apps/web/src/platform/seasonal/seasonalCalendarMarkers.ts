import { Temporal } from '@js-temporal/polyfill';
import { easterSunday } from './seasonalEvents';

export type SeasonalCalendarMarker = {
  eventId: 'christmas' | 'new-year' | 'easter' | 'festa-junina' | 'halloween';
  label: string;
  date: string;
};

function fixedMarker(
  year: number,
  month: number,
  day: number,
  eventId: SeasonalCalendarMarker['eventId'],
  label: string,
): SeasonalCalendarMarker {
  return {
    eventId,
    label,
    date: Temporal.PlainDate.from({ year, month, day }).toString(),
  };
}

export function seasonalCalendarMarkersForYear(year: number): SeasonalCalendarMarker[] {
  if (!Number.isInteger(year) || year < 1583 || year > 9999) {
    throw new RangeError('Ano gregoriano inválido para marcadores sazonais.');
  }

  const easter = easterSunday(year);
  return [
    fixedMarker(year, 1, 1, 'new-year', 'Ano-Novo'),
    { eventId: 'easter', label: 'Páscoa', date: easter.toString() },
    fixedMarker(year, 6, 24, 'festa-junina', 'Festa Junina'),
    fixedMarker(year, 10, 31, 'halloween', 'Halloween'),
    fixedMarker(year, 12, 25, 'christmas', 'Natal'),
    fixedMarker(year, 12, 31, 'new-year', 'Ano-Novo'),
  ];
}

export function seasonalCalendarMarkerForDate(civilDate: string): SeasonalCalendarMarker | null {
  const date = Temporal.PlainDate.from(civilDate);
  return seasonalCalendarMarkersForYear(date.year).find(marker => marker.date === civilDate) ?? null;
}
