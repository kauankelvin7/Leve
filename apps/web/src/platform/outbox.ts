import type { CommandEnvelope } from '../../../../packages/domain/src/identity';
import { localTransaction, OUTBOX_STORE, SESSION_STORE } from './localData';
import type { SessionResult } from '../../../../packages/domain/src/identity';

export type PendingCommand = { key: string; operationId: string; uid: string; command: CommandEnvelope; createdAt: string };

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('leve-outbox');
const owner = crypto.randomUUID();

function announceChange() {
  window.dispatchEvent(new CustomEvent('leve:outbox-changed'));
  channel?.postMessage('changed');
}

channel?.addEventListener('message', () => window.dispatchEvent(new CustomEvent('leve:outbox-changed')));

export function offlineEnabled() { return localStorage.getItem('leve.offlineEnabled') === 'true'; }

export async function cacheSession(uid: string, session: SessionResult) {
  if (!offlineEnabled()) return;
  await localTransaction<void>(SESSION_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put({ uid, session, cachedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

export async function readCachedSession(uid: string) {
  if (!offlineEnabled()) return null;
  return localTransaction<{ uid: string; session: SessionResult; cachedAt: string } | undefined>(SESSION_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(uid);
    request.onsuccess = () => resolve(request.result as { uid: string; session: SessionResult; cachedAt: string } | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function queueCommand(uid: string, command: CommandEnvelope) {
  const entry: PendingCommand = { key: `${uid}:${command.operationId}`, operationId: command.operationId, uid, command, createdAt: new Date().toISOString() };
  await localTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => { const request = store.put(entry); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  announceChange();
}

export async function pendingCommands(uid: string): Promise<PendingCommand[]> {
  return localTransaction(OUTBOX_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.index('uid-createdAt').getAll(IDBKeyRange.bound([uid, ''], [uid, '\uffff']));
    request.onsuccess = () => resolve(request.result as PendingCommand[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeCommand(uid: string, operationId: string) {
  await localTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => { const request = store.delete(`${uid}:${operationId}`); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  announceChange();
}

async function fallbackLeadership<T>(uid: string, task: () => Promise<T>): Promise<T | undefined> {
  const key = `leve.outboxLease.${uid}`;
  const now = Date.now();
  const current = JSON.parse(localStorage.getItem(key) ?? 'null') as { owner?: string; expiresAt?: number } | null;
  if (current?.owner !== owner && (current?.expiresAt ?? 0) > now) return undefined;
  localStorage.setItem(key, JSON.stringify({ owner, expiresAt: now + 30_000 }));
  const acquired = JSON.parse(localStorage.getItem(key) ?? 'null') as { owner?: string } | null;
  if (acquired?.owner !== owner) return undefined;
  try { return await task(); }
  finally {
    const latest = JSON.parse(localStorage.getItem(key) ?? 'null') as { owner?: string } | null;
    if (latest?.owner === owner) localStorage.removeItem(key);
  }
}

export async function withOutboxLeadership<T>(uid: string, task: () => Promise<T>): Promise<T | undefined> {
  if (navigator.locks) return navigator.locks.request(`leve-outbox-${uid}`, { ifAvailable: true }, lock => lock ? task() : undefined);
  return fallbackLeadership(uid, task);
}
