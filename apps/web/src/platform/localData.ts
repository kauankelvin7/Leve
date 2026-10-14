const DATABASE = 'leve-local-v1';
const VERSION = 5;

export const OUTBOX_STORE = 'outbox-v2';
export const DRAFT_STORE = 'drafts';
export const SESSION_STORE = 'session-cache';
export const LEASE_STORE = 'outbox-leases';

export function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    let blocked = false;
    request.onupgradeneeded = event => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, { keyPath: 'key' });
        outbox.createIndex('uid-createdAt', ['uid', 'createdAt']);
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      if (!database.objectStoreNames.contains(SESSION_STORE)) database.createObjectStore(SESSION_STORE, { keyPath: 'uid' });

      if (!database.objectStoreNames.contains(LEASE_STORE)) database.createObjectStore(LEASE_STORE, { keyPath: 'uid' });

      // v4 already migrated these rows. Reimporting on v5 would resurrect sent work.
      if (event.oldVersion < 4 && database.objectStoreNames.contains('outbox')) {
        const legacy = request.transaction!.objectStore('outbox');
        const current = request.transaction!.objectStore(OUTBOX_STORE);
        legacy.openCursor().onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) { database.deleteObjectStore('outbox'); return; }
          const value = cursor.value as { uid?: string; operationId?: string };
          if (value.uid && value.operationId) current.put({ ...value, key: `${value.uid}:${value.operationId}` });
          cursor.continue();
        };
      } else if (database.objectStoreNames.contains('outbox')) database.deleteObjectStore('outbox');
    };
    request.onblocked = () => { blocked = true; reject(new Error('Local database upgrade is blocked by another open Leve tab.')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function localTransaction<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void) {
  const database = await openLocalDatabase();
  return new Promise<T>((resolve, reject) => {
    let current: IDBTransaction;
    try { current = database.transaction(storeName, mode); }
    catch (failure) { database.close(); reject(failure); return; }
    let result: T;
    let failure: unknown;
    current.oncomplete = () => { database.close(); resolve(result); };
    current.onabort = () => { database.close(); reject(failure ?? current.error ?? new Error('Local transaction aborted')); };
    current.onerror = () => { failure ??= current.error; };
    const abort = (reason?: unknown) => {
      failure = reason ?? new Error('Local transaction failed');
      try { current.abort(); }
      catch { database.close(); reject(failure); }
    };
    // A request success is not a durable commit. Resolve only at oncomplete.
    try { run(current.objectStore(storeName), value => { result = value; }, abort); }
    catch (reason) { abort(reason); }
  });
}
