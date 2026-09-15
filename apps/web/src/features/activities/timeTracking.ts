import type { TimeEntry } from '../../../../../packages/domain/src/content';

export function timeEntrySeconds(entry: TimeEntry, now = Date.now()) {
  if (entry.endedAt) return entry.durationSeconds;
  const accumulated = entry.accumulatedSeconds ?? 0;
  return accumulated + (entry.paused ? 0 : Math.max(0, Math.floor((now - Date.parse(entry.startedAt)) / 1000)));
}

export function compactDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours}h ` : ''}${minutes}min`;
}

export function timerClock(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor(seconds % 3600 / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainder}`;
}
