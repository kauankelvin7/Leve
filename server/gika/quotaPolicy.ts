export function parseGikaDailyLimit(setting = process.env.GIKA_DAILY_LIMIT): number | null {
  if (setting === undefined || setting.trim() === '') return null;
  const normalized = setting.trim();
  if (!/^[1-9]\d*$/.test(normalized)) throw new Error('Invalid GIKA_DAILY_LIMIT configuration');
  const limit = Number(normalized);
  if (!Number.isSafeInteger(limit)) throw new Error('Invalid GIKA_DAILY_LIMIT configuration');
  return limit;
}

/** Cap upstream reservations, not UI messages. Never exceed the former 3 × 2-call envelope. */
export function parseGikaMinuteLimit(setting = process.env.GIKA_MINUTE_LIMIT): number {
  if (setting === undefined || setting.trim() === '') return 6;
  if (!/^[1-6]$/.test(setting.trim())) throw new Error('Invalid GIKA_MINUTE_LIMIT configuration');
  return Number(setting.trim());
}
