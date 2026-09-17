import { seasonalSeenStorageKey, type SeasonalPeriod } from './seasonalEvents';

export const SEASONAL_ENABLED_STORAGE_KEY = 'leve.seasonal.enabled';

type SeasonalStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): SeasonalStorage | null {
  try { return window.localStorage; }
  catch { return null; }
}

export function storedSeasonalDetailsEnabled(storage: SeasonalStorage | null = browserStorage()): boolean {
  if (!storage) return true;
  try { return storage.getItem(SEASONAL_ENABLED_STORAGE_KEY) !== 'false'; }
  catch { return true; }
}

export function storeSeasonalDetailsEnabled(enabled: boolean, storage: SeasonalStorage | null = browserStorage()): void {
  if (!storage) return;
  try { storage.setItem(SEASONAL_ENABLED_STORAGE_KEY, String(enabled)); }
  catch { /* a preferência remota continua sendo a fonte de verdade autenticada */ }
}

export function hasSeenSeasonalIntro(period: Pick<SeasonalPeriod, 'eventId' | 'periodId'>, storage: SeasonalStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try { return storage.getItem(seasonalSeenStorageKey(period)) === '1'; }
  catch { return false; }
}

export function markSeasonalIntroSeen(period: Pick<SeasonalPeriod, 'eventId' | 'periodId'>, storage: SeasonalStorage | null = browserStorage()): void {
  if (!storage) return;
  try { storage.setItem(seasonalSeenStorageKey(period), '1'); }
  catch { /* a intro pode reaparecer se o navegador bloquear armazenamento local */ }
}