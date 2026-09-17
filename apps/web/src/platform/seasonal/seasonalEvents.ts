import { Temporal } from '@js-temporal/polyfill';

export type SeasonalSurface = 'login' | 'today' | 'calendar' | 'global';

export type SeasonalPeriod = {
  eventId: string;
  label: string;
  start: string;
  end: string;
  periodId: string;
  surfaces: readonly SeasonalSurface[];
  decoration: string;
  intro?: string;
};

type SeasonalEventDefinition = {
  id: string;
  label: string;
  surfaces: readonly SeasonalSurface[];
  decoration: string;
  intro?: string;
  resolvePeriod: (year: number) => SeasonalPeriod;
};

function fixedPeriod(definition: Omit<SeasonalEventDefinition, 'resolvePeriod'>, year: number, startMonth: number, startDay: number, endMonth: number, endDay: number): SeasonalPeriod {
  const start = Temporal.PlainDate.from({ year, month: startMonth, day: startDay });
  const endYear = endMonth < startMonth ? year + 1 : year;
  const end = Temporal.PlainDate.from({ year: endYear, month: endMonth, day: endDay });
  return {
    eventId: definition.id,
    label: definition.label,
    start: start.toString(),
    end: end.toString(),
    periodId: endYear === year ? `${definition.id}-${year}` : `${definition.id}-${year}-${endYear}`,
    surfaces: definition.surfaces,
    decoration: definition.decoration,
    ...(definition.intro ? { intro: definition.intro } : {}),
  };
}

/** Gregorian computus (Meeus/Jones/Butcher), used locally with no network dependency. */
export function easterSunday(year: number): Temporal.PlainDate {
  if (!Number.isInteger(year) || year < 1583 || year > 9999) throw new RangeError('Ano gregoriano inválido para cálculo da Páscoa.');
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Temporal.PlainDate.from({ year, month, day });
}

const christmasBase = {
  id: 'christmas', label: 'Natal', surfaces: ['login', 'today', 'calendar', 'global'], decoration: 'christmas', intro: 'christmas-star',
} as const;
const newYearBase = {
  id: 'new-year', label: 'Ano-Novo', surfaces: ['login', 'today', 'calendar', 'global'], decoration: 'new-year', intro: 'new-year-sparkles',
} as const;
const juneBase = {
  id: 'festa-junina', label: 'Festa Junina', surfaces: ['login', 'today', 'calendar', 'global'], decoration: 'festa-junina', intro: 'festa-junina-flags',
} as const;
const halloweenBase = {
  id: 'halloween', label: 'Halloween', surfaces: ['login', 'today', 'calendar', 'global'], decoration: 'halloween', intro: 'halloween-moon',
} as const;
const easterBase = {
  id: 'easter', label: 'Páscoa', surfaces: ['login', 'today', 'calendar', 'global'], decoration: 'easter', intro: 'easter-paper',
} as const;

export const seasonalEvents: readonly SeasonalEventDefinition[] = [
  { ...christmasBase, resolvePeriod: year => fixedPeriod(christmasBase, year, 12, 20, 12, 25) },
  { ...newYearBase, resolvePeriod: year => fixedPeriod(newYearBase, year, 12, 31, 1, 1) },
  {
    ...easterBase,
    resolvePeriod: year => {
      const sunday = easterSunday(year);
      const start = sunday.subtract({ days: 2 });
      return {
        eventId: easterBase.id,
        label: easterBase.label,
        start: start.toString(),
        end: sunday.toString(),
        periodId: `${easterBase.id}-${year}`,
        surfaces: easterBase.surfaces,
        decoration: easterBase.decoration,
        intro: easterBase.intro,
      };
    },
  },
  { ...juneBase, resolvePeriod: year => fixedPeriod(juneBase, year, 6, 12, 6, 30) },
  { ...halloweenBase, resolvePeriod: year => fixedPeriod(halloweenBase, year, 10, 29, 10, 31) },
];

export function activeSeasonalPeriods(civilDate: string): SeasonalPeriod[] {
  const date = Temporal.PlainDate.from(civilDate);
  const candidates = [date.year - 1, date.year]
    .flatMap(year => seasonalEvents.map(event => event.resolvePeriod(year)));
  const active = candidates.filter(period => Temporal.PlainDate.compare(date, Temporal.PlainDate.from(period.start)) >= 0 && Temporal.PlainDate.compare(date, Temporal.PlainDate.from(period.end)) <= 0);
  return [...new Map(active.map(period => [`${period.eventId}:${period.periodId}`, period])).values()];
}

export function seasonalSeenStorageKey(period: Pick<SeasonalPeriod, 'eventId' | 'periodId'>): string {
  return `leve.seasonal.seen.${period.eventId}.${period.periodId}`;
}
