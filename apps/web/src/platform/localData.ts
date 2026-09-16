const DATABASE = 'leve-local-v1';
const VERSION = 4;

export const OUTBOX_STORE = 'outbox-v2';
export const DRAFT_STORE = 'drafts';
export const SESSION_STORE = 'session-cache';

export function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, { keyPath: 'key' });
        outbox.createIndex('uid-createdAt', ['uid', 'createdAt']);
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      if (!database.objectStoreNames.contains(SESSION_STORE)) database.createObjectStore(SESSION_STORE, { keyPath: 'uid' });

      if (database.objectStoreNames.contains('outbox')) {
        const legacy = request.transaction!.objectStore('outbox');
        const current = request.transaction!.objectStore(OUTBOX_STORE);
        legacy.openCursor().onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          const value = cursor.value as { uid?: string; operationId?: string };
          if (value.uid && value.operationId) current.put({ ...value, key: `${value.uid}:${value.operationId}` });
          cursor.continue();
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function localTransaction<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void) {
  const database = await openLocalDatabase();
  return new Promise<T>((resolve, reject) => {
    const current = database.transaction(storeName, mode);
    run(current.objectStore(storeName), resolve, reject);
    current.oncomplete = () => database.close();
    current.onerror = () => reject(current.error);
  });
}
