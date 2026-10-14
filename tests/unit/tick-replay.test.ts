import { beforeEach, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ doc: vi.fn((path: string) => ({ path })), runTransaction: vi.fn() }));
vi.mock('../../server/platform/firebase.ts', () => ({ db: database }));
import { claimTickReplay, MAX_TICK_REPLAY_CLAIMS } from '../../server/tick-replay';
import { tickSignature, TICK_VALIDITY_MS } from '../../server/tick-signature';
const now = Date.UTC(2026, 9, 5, 12);
let state: Record<string, unknown> | undefined;
let writes = 0;
function proof(milliseconds = now) {
  const timestamp = String(milliseconds);
  return { timestamp, signature: tickSignature('test-only-secret', timestamp), milliseconds };
}
beforeEach(() => {
  state = undefined; writes = 0; vi.clearAllMocks();
  database.runTransaction.mockImplementation(async work => work({
    get: async () => ({ exists: state !== undefined, data: () => state }),
    set: (_ref: unknown, data: Record<string, unknown>) => { state = data; writes++; },
  }));
});

it('rejects repeated verified proofs durably, storing only a digest and expiration', async () => {
  const value = proof();
  await claimTickReplay(value, now);
  await expect(claimTickReplay(value, now + 1)).rejects.toMatchObject({ status: 409, code: 'TICK_REPLAY' });
  expect(writes).toBe(1);
  expect(JSON.stringify(state)).not.toContain(value.signature);
  expect(state).toMatchObject({ claims: [{ digest: expect.stringMatching(/^[a-f0-9]{64}$/), validUntilMs: now + TICK_VALIDITY_MS }] });
  expect(database.doc).toHaveBeenCalledWith('maintenance/internalTickReplay');
});

it('retains proofs through inclusive validity and the entire future timestamp window', async () => {
  const future = proof(now + TICK_VALIDITY_MS);
  await claimTickReplay(future, now);
  await expect(claimTickReplay(future, now + TICK_VALIDITY_MS * 2)).rejects.toMatchObject({ code: 'TICK_REPLAY' });
  await expect(claimTickReplay(future, now + TICK_VALIDITY_MS * 2 + 1)).rejects.toMatchObject({ status: 401 });
  await claimTickReplay(proof(now + TICK_VALIDITY_MS * 2 + 1), now + TICK_VALIDITY_MS * 2 + 1);
  expect(state?.claims).toHaveLength(1);
});

it('bounds storage without evicting live proofs to make room for new ones', async () => {
  for (let index = 0; index < MAX_TICK_REPLAY_CLAIMS; index++) await claimTickReplay(proof(now + index), now);
  await expect(claimTickReplay(proof(now + MAX_TICK_REPLAY_CLAIMS), now)).rejects.toMatchObject({ status: 429, code: 'TICK_CAPACITY' });
  await expect(claimTickReplay(proof(), now)).rejects.toMatchObject({ code: 'TICK_REPLAY' });
  expect(state?.claims).toHaveLength(MAX_TICK_REPLAY_CLAIMS);
  expect(writes).toBe(MAX_TICK_REPLAY_CLAIMS);
});

it.each([{}, { claims: null }, { claims: [{ digest: 'invalid', validUntilMs: now }] }, { claims: [{ digest: 'a'.repeat(64), validUntilMs: null }] }, { claims: Array(MAX_TICK_REPLAY_CLAIMS + 1).fill({ digest: 'a'.repeat(64), validUntilMs: now }) }])('fails closed on malformed replay state', async malformed => {
  state = malformed;
  await expect(claimTickReplay(proof(), now)).rejects.toMatchObject({ status: 503 });
  expect(state).toBe(malformed); expect(writes).toBe(0);
});

it('does not execute a claim when the store is unavailable', async () => {
  database.runTransaction.mockRejectedValueOnce(new Error('Synthetic store outage'));
  await expect(claimTickReplay(proof(), now)).rejects.toThrow('Synthetic store outage');
  expect(writes).toBe(0);
});
