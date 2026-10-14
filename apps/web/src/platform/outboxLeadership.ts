import { LEASE_STORE, localTransaction } from './localData';

const owner = crypto.randomUUID();
const LEASE_DURATION_MS = 30_000;
type Lease = { uid: string; owner: string; fence: number; expiresAt: number };
export type LeadershipGuard = () => Promise<void>;

export class OutboxLeadershipLostError extends Error {
  constructor() { super('Outbox leadership lost'); this.name = 'OutboxLeadershipLostError'; }
}

async function acquire(uid: string): Promise<Lease | undefined> {
  return localTransaction(LEASE_STORE, 'readwrite', (store, resolve, reject) => {
    const read = store.get(uid);
    read.onerror = () => reject(read.error);
    read.onsuccess = () => {
      const previous = read.result as Lease | undefined;
      const now = Date.now();
      if (previous && previous.expiresAt > now) { resolve(undefined); return; }
      const lease = { uid, owner, fence: (previous?.fence ?? 0) + 1, expiresAt: now + LEASE_DURATION_MS };
      const write = store.put(lease);
      write.onerror = () => reject(write.error);
      write.onsuccess = () => resolve(lease);
    };
  });
}

async function updateLease(lease: Lease, release = false) {
  return localTransaction<void>(LEASE_STORE, 'readwrite', (store, resolve, reject) => {
    const read = store.get(lease.uid);
    read.onerror = () => reject(read.error);
    read.onsuccess = () => {
      const current = read.result as Lease | undefined;
      if (!current || current.owner !== lease.owner || current.fence !== lease.fence || (!release && current.expiresAt <= Date.now())) {
        if (release) resolve(); else reject(new OutboxLeadershipLostError());
        return;
      }
      const write = store.put({ ...current, expiresAt: release ? 0 : Date.now() + LEASE_DURATION_MS });
      write.onerror = () => reject(write.error);
      write.onsuccess = () => resolve();
    };
  });
}

export async function withOutboxLeadership<T>(uid: string, task: (guard: LeadershipGuard) => Promise<T>): Promise<T | undefined> {
  if (navigator.locks) return navigator.locks.request(`leve-outbox-${uid}`, { ifAvailable: true }, lock => lock ? task(async () => {}) : undefined);
  // IndexedDB readwrite transactions serialize acquisition across all tabs.
  // localStorage read/check/write cannot provide that guarantee.
  const lease = await acquire(uid);
  if (!lease) return undefined;
  let lost = false;
  const guard = async () => {
    if (lost) throw new OutboxLeadershipLostError();
    await updateLease(lease);
  };
  const heartbeat = setInterval(() => { void guard().catch(() => { lost = true; }); }, LEASE_DURATION_MS / 3);
  try { return await task(guard); }
  finally { clearInterval(heartbeat); await updateLease(lease, true); }
}
