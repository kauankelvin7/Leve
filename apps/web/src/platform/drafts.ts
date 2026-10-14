import { DRAFT_STORE, localTransaction } from './localData';
import { offlineEnabled } from './outbox';

type DraftRecord<T> = { key: string; uid: string; name: string; value: T; updatedAt: string };

function recordKey(uid: string, name: string) { return `${uid}:${name}`; }
function sessionKey(uid: string, name: string) { return `leve.draft.${recordKey(uid, name)}`; }

export async function saveDraft<T>(uid: string, name: string, value: T) {
  const record: DraftRecord<T> = { key: recordKey(uid, name), uid, name, value, updatedAt: new Date().toISOString() };
  if (!offlineEnabled(uid)) { sessionStorage.setItem(sessionKey(uid, name), JSON.stringify(record)); return; }
  try {
    await localTransaction<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put(record); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  } catch { sessionStorage.setItem(sessionKey(uid, name), JSON.stringify(record)); }
}

export async function readDraft<T>(uid: string, name: string): Promise<T | null> {
  let temporary: DraftRecord<T> | null = null;
  try { const raw = sessionStorage.getItem(sessionKey(uid, name)); if (raw) temporary = JSON.parse(raw) as DraftRecord<T>; } catch { /* A malformed temporary record does not hide a legacy draft. */ }
  try {
    const persistent = await localTransaction<DraftRecord<T> | undefined>(DRAFT_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.get(recordKey(uid, name)); request.onsuccess = () => resolve(request.result as DraftRecord<T> | undefined); request.onerror = () => reject(request.error);
    });
    // Reading an older draft is permitted even after opting out; migration must
    // not make existing user work inaccessible. New writes follow the policy.
    if (!persistent || (temporary && temporary.updatedAt >= persistent.updatedAt)) return temporary?.value ?? null;
    return persistent.value;
  } catch { return temporary?.value ?? null; }
}

export async function removeDraft(uid: string, name: string) {
  sessionStorage.removeItem(sessionKey(uid, name));
  try {
    await localTransaction<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.delete(recordKey(uid, name)); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  } catch { /* A confirmed remote save must not be rolled back by local cleanup. */ }
}
