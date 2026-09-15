export const MIN_SESSION_MS = 30_000;
export const MAX_RECOVERY_AGE_MS = 4 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'leve.activitySession.';
export const activeSessionIds = new Set<string>();

export function sessionTabId() {
  const key = 'leve.sessionTab';
  let id = sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
  return id;
}

export type StoredSession = {
  uid: string;
  tabId: string;
  active: boolean;
  sessionId: string;
  activityId: string;
  activityTitle: string;
  timeZone: string;
  startedAt: number;
  accumulatedMs: number;
  resumedAt: number | null;
  savedAt: number;
};

export class ActivitySession {
  private data: StoredSession;
  private finished = false;

  constructor(activityId: string, activityTitle: string, timeZone: string, now = Date.now(), sessionId = crypto.randomUUID(), uid = '', tabId = '') {
    this.data = { uid, tabId, active: true, sessionId, activityId, activityTitle, timeZone, startedAt: now, accumulatedMs: 0, resumedAt: now, savedAt: now };
  }

  pause(now = Date.now()) {
    if (this.finished || this.data.resumedAt === null) return;
    this.data.accumulatedMs += Math.max(0, now - this.data.resumedAt);
    this.data.resumedAt = null;
    this.data.savedAt = now;
  }

  resume(now = Date.now()) {
    if (this.finished || this.data.resumedAt !== null) return;
    this.data.resumedAt = now;
    this.data.savedAt = now;
  }

  elapsedMs(now = Date.now()) {
    return this.data.accumulatedMs + (this.data.resumedAt === null ? 0 : Math.max(0, now - this.data.resumedAt));
  }

  snapshot(now = Date.now()): StoredSession {
    return { ...this.data, accumulatedMs: this.elapsedMs(now), resumedAt: null, savedAt: now };
  }

  finish(now = Date.now()) {
    if (this.finished) return null;
    this.pause(now); this.finished = true;
    return { ...this.data, active: false, savedAt: now };
  }
}

export function sessionStorageKey(session: Pick<StoredSession, 'activityId' | 'sessionId'>) {
  return `${STORAGE_PREFIX}${session.activityId}.${session.sessionId}`;
}

export function saveUnfinishedSession(storage: Storage, session: StoredSession) {
  storage.setItem(sessionStorageKey(session), JSON.stringify(session));
}

export function removeUnfinishedSession(storage: Storage, session: Pick<StoredSession, 'activityId' | 'sessionId'>) {
  storage.removeItem(sessionStorageKey(session));
}

export function findRecoverableSessions(storage: Storage, activityId?: string, now = Date.now(), uid = '', tabId = '') {
  const found: StoredSession[] = [];
  const prefix = activityId ? `${STORAGE_PREFIX}${activityId}.` : STORAGE_PREFIX;
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const value = JSON.parse(storage.getItem(key) ?? '') as StoredSession;
      if (!value || typeof value.activityId !== 'string' || typeof value.activityTitle !== 'string' || typeof value.sessionId !== 'string' || !Number.isFinite(value.savedAt) || !Number.isFinite(value.startedAt) || !Number.isFinite(value.accumulatedMs)) { storage.removeItem(key); continue; }
      if (value.uid !== uid || activeSessionIds.has(value.sessionId)) continue;
      if (value.active && value.tabId !== tabId && now - value.savedAt < 15_000) continue;
      const age = now - value.savedAt;
      if (age >= 0 && age < MAX_RECOVERY_AGE_MS && value.accumulatedMs >= MIN_SESSION_MS) found.push(value);
      else storage.removeItem(key);
    } catch { storage.removeItem(key); }
  }
  return found.sort((left, right) => right.savedAt - left.savedAt);
}
