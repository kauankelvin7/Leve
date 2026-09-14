import { DRAFT_STORE, localTransaction } from './localData';
import { offlineEnabled } from './outbox';

type DraftRecord<T> = { key: string; uid: string; name: string; value: T; updatedAt: string };

function recordKey(uid: string, name: string) { return `${uid}:${name}`; }
function sessionKey(uid: string, name: string) { return `leve.draft.${recordKey(uid, name)}`; }

export async function saveDraft<T>(uid: string, name: string, value: T) {
  const record: DraftRecord<T> = { key: recordKey(uid, name), uid, name, value, updatedAt: new Date().toISOString() };
  if (!offlineEnabled()) { sessionStorage.setItem(sessionKey(uid, name), JSON.stringify(record)); return; }
  try {
    await localTransaction<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  } catch { sessionStorage.setItem(sessionKey(uid, name), JSON.stringify(record)); }
}

export async function readDraft<T>(uid: string, name: string): Promise<T | null> {
  if (!offlineEnabled()) {
    const raw = sessionStorage.getItem(sessionKey(uid, name));
    return raw ? (JSON.parse(raw) as DraftRecord<T>).value : null;
  }
  try {
    return await localTransaction(DRAFT_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.get(recordKey(uid, name));
      request.onsuccess = () => resolve((request.result as DraftRecord<T> | undefined)?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    const raw = sessionStorage.getItem(sessionKey(uid, name));
    return raw ? (JSON.parse(raw) as DraftRecord<T>).value : null;
  }
}

export async function removeDraft(uid: string, name: string) {
  sessionStorage.removeItem(sessionKey(uid, name));
  if (!offlineEnabled()) return;
  try {
    await localTransaction<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.delete(recordKey(uid, name)); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  } catch { /* A confirmed remote save must not be rolled back by local cleanup. */ }
}
