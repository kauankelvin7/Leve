export function parseGikaDailyLimit(setting = process.env.GIKA_DAILY_LIMIT): number | null {
  if (setting === undefined || setting.trim() === '') return null;
  const normalized = setting.trim();
  if (!/^[1-9]\d*$/.test(normalized)) throw new Error('Invalid GIKA_DAILY_LIMIT configuration');
  const limit = Number(normalized);
  if (!Number.isSafeInteger(limit)) throw new Error('Invalid GIKA_DAILY_LIMIT configuration');
  return limit;
}
