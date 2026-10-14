import { afterEach, describe, expect, it, vi } from 'vitest';
import { localTransaction, openLocalDatabase } from '../../apps/web/src/platform/localData';

afterEach(() => vi.unstubAllGlobals());
function database() {
  const store = {} as IDBObjectStore;
  const tx = { objectStore: () => store, abort: vi.fn(), error: null, onabort: null, onerror: null, oncomplete: null };
  const db = { transaction: () => tx, close: vi.fn() };
  vi.stubGlobal('indexedDB', { open: () => { const request = { result: db, onsuccess: null as null | (() => void) }; queueMicrotask(() => request.onsuccess?.()); return request; } });
  return { tx, db };
}

describe('GOAL-01 durable local transaction', () => {
  it('does not resolve on request success before the transaction commits', async () => {
    const { tx, db } = database(); let settled = false;
    const promise = localTransaction('outbox-v2', 'readwrite', (_store, resolve) => resolve('saved')).then(value => { settled = true; return value; });
    await new Promise(resolve => setTimeout(resolve, 0)); expect(settled).toBe(false);
    (tx.oncomplete as unknown as () => void)(); expect(await promise).toBe('saved'); expect(db.close).toHaveBeenCalled();
  });
  it('rejects abort after a request succeeded, preserving commit failure visibility', async () => {
    const { tx, db } = database();
    const promise = localTransaction('outbox-v2', 'readwrite', (_store, resolve) => resolve('saved'));
    await new Promise(resolve => setTimeout(resolve, 0));
    (tx.onabort as unknown as () => void)(); await expect(promise).rejects.toThrow('aborted'); expect(db.close).toHaveBeenCalled();
  });
  it('aborts and closes a transaction when its callback throws', async () => {
    const { tx, db } = database(); tx.abort.mockImplementation(() => (tx.onabort as unknown as () => void)());
    await expect(localTransaction('outbox-v2', 'readwrite', () => { throw new Error('disk quota'); })).rejects.toThrow('disk quota');
    expect(tx.abort).toHaveBeenCalled(); expect(db.close).toHaveBeenCalled();
  });
  it('rejects a blocked upgrade instead of leaving callers waiting forever', async () => {
    const close = vi.fn();
    vi.stubGlobal('indexedDB', { open: () => {
      const database = { close, onversionchange: null };
      const request = { result: database, onblocked: null as null | (() => void), onsuccess: null as null | (() => void) };
      queueMicrotask(() => { request.onblocked?.(); request.onsuccess?.(); }); return request;
    } });
    await expect(openLocalDatabase()).rejects.toThrow('blocked by another open Leve tab');
    expect(close).toHaveBeenCalledOnce();
  });
});
