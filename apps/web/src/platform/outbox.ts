import type { CommandEnvelope } from '../../../../packages/domain/src/identity';
import { localTransaction, DRAFT_STORE, OUTBOX_STORE, SESSION_STORE, openLocalDatabase } from './localData';
import { offlineEnabled } from './offlinePreference';
export { offlineEnabled } from './offlinePreference';
import type { SessionResult } from '../../../../packages/domain/src/identity';

export type PendingCommand = { key: string; operationId: string; uid: string; command: CommandEnvelope; createdAt: string };

const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('leve-outbox');
import { withOutboxLeadership } from './outboxLeadership';
export { withOutboxLeadership } from './outboxLeadership';

function announceChange() {
  window.dispatchEvent(new CustomEvent('leve:outbox-changed'));
  channel?.postMessage('changed');
}

channel?.addEventListener('message', () => window.dispatchEvent(new CustomEvent('leve:outbox-changed')));

export async function cacheSession(uid: string, session: SessionResult) {
  if (!offlineEnabled(uid)) return;
  await localTransaction<void>(SESSION_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put({ uid, session, cachedAt: new Date().toISOString() });
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

export async function readCachedSession(uid: string) {
  if (!offlineEnabled(uid)) return null;
  return localTransaction<{ uid: string; session: SessionResult; cachedAt: string } | undefined>(SESSION_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(uid);
    request.onsuccess = () => resolve(request.result as { uid: string; session: SessionResult; cachedAt: string } | undefined);
    request.onerror = () => reject(request.error);
  });
}

function sameCommand(left: CommandEnvelope, right: CommandEnvelope) {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export async function queueCommand(uid: string, command: CommandEnvelope) {
  const entry: PendingCommand = { key: `${uid}:${command.operationId}`, operationId: command.operationId, uid, command, createdAt: new Date().toISOString() };
  await localTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => {
    const read = store.get(entry.key);
    read.onerror = () => reject(read.error);
    read.onsuccess = () => {
      const previous = read.result as PendingCommand | undefined;
      if (previous) {
        if (!sameCommand(previous.command, command)) { reject(new Error('operationId already belongs to another pending command')); return; }
        resolve(); // Preserve the original age and content for identical retries.
        return;
      }
      const write = store.add(entry);
      write.onsuccess = () => resolve(); write.onerror = () => reject(write.error);
    };
  });
  announceChange();
}

export async function pendingCommands(uid: string): Promise<PendingCommand[]> {
  return localTransaction(OUTBOX_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.index('uid-createdAt').getAll(IDBKeyRange.bound([uid, ''], [uid, '\uffff']));
    request.onsuccess = () => resolve(request.result as PendingCommand[]);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOutboxEntry(uid: string, operationId: string) {
  await localTransaction<void>(OUTBOX_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.delete(`${uid}:${operationId}`);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  announceChange();
}

export async function removeCommand(uid: string, operationId: string) {
  const acquired = await withOutboxLeadership(uid, async () => {
    await deleteOutboxEntry(uid, operationId);
    return true;
  });
  if (!acquired) {
    throw new Error('A sincronização está em andamento. Aguarde antes de remover.');
  }
}

export async function clearCachedSession(uid: string) {
  await localTransaction<void>(SESSION_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.delete(uid); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}

export async function clearLegacySessionCache() {
  await localTransaction<void>(SESSION_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(); return; }
      const record = cursor.value as { uid?: string } | undefined;
      if (!record?.uid || !offlineEnabled(record.uid)) {
        cursor.delete();
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function temporaryWork(uid: string) {
  const entries: Array<{ storage: Storage; key: string; raw: string }> = [];
  for (let index = 0; index < sessionStorage.length; index++) {
    const key = sessionStorage.key(index); if (key?.startsWith(`leve.draft.${uid}:`)) entries.push({ storage: sessionStorage, key, raw: sessionStorage.getItem(key) ?? '' });
  }
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index); if (!key?.startsWith('leve.activitySession.')) continue;
    const raw = localStorage.getItem(key) ?? '';
    try { if ((JSON.parse(raw) as { uid?: string }).uid === uid) entries.push({ storage: localStorage, key, raw }); } catch { /* Unknown ownership is never deleted. */ }
  }
  return entries;
}
function workFingerprint(rows: Array<{ key: string }>, temporary: ReturnType<typeof temporaryWork>) {
  return JSON.stringify([...rows.map(row => JSON.stringify(row)), ...temporary.map(row => `${row.key}:${row.raw}`)].sort());
}
export async function localWorkCounts(uid: string) {
  const drafts = await localTransaction<Array<{ key: string; uid: string }>>(DRAFT_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.getAll(); request.onsuccess = () => resolve(request.result.filter((record: { uid: string }) => record.uid === uid)); request.onerror = () => reject(request.error);
  });
  const pending = await pendingCommands(uid);
  const temporary = temporaryWork(uid);
  return { pending: pending.length, drafts: drafts.length + temporary.length, fingerprint: workFingerprint([...drafts, ...pending], temporary) };
}

export function localWorkDescription(work: { pending: number; drafts: number }) {
  return `${work.pending} ${work.pending === 1 ? 'alteração pendente' : 'alterações pendentes'} e ${work.drafts} ${work.drafts === 1 ? 'rascunho' : 'rascunhos'}`;
}

/** Work is only discarded after an explicit user confirmation. A snapshot is
 * rechecked inside the write transaction so another tab cannot add work after
 * the dialog and have it silently deleted. */
export async function clearLocalData(uid: string, options: { discardUserWork?: boolean; expectedFingerprint?: string } = {}) {
  if (!options.discardUserWork) { await clearCachedSession(uid); return; }
  if (options.expectedFingerprint === undefined) throw new Error('Local cleanup requires confirmed work snapshot');
  const database = await openLocalDatabase();
  let removedTemporary: ReturnType<typeof temporaryWork> = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([SESSION_STORE, OUTBOX_STORE, DRAFT_STORE], 'readwrite');
      const rows: Record<string, Array<{ uid: string; key: string }>> = {};
      let completedReads = 0;
      for (const name of [OUTBOX_STORE, DRAFT_STORE]) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => {
          rows[name] = request.result.filter((row: { uid: string }) => row.uid === uid);
          if (++completedReads !== 2) return;
          removedTemporary = temporaryWork(uid);
          if (workFingerprint([...rows[OUTBOX_STORE]!, ...rows[DRAFT_STORE]!], removedTemporary) !== options.expectedFingerprint) { transaction.abort(); return; }
          transaction.objectStore(SESSION_STORE).delete(uid);
          for (const storeName of [OUTBOX_STORE, DRAFT_STORE]) for (const row of rows[storeName]!) transaction.objectStore(storeName).delete(row.key);
        };
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error('O conteúdo local mudou em outra aba. Revise novamente antes de remover.'));
    });
  } finally { database.close(); }
  for (const entry of removedTemporary) if (entry.storage.getItem(entry.key) === entry.raw) entry.storage.removeItem(entry.key);
  announceChange();
}
