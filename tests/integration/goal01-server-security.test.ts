import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server/app';
import { auth, db } from '../../server/platform/firebase';
import { createGikaRecoveryQuota } from '../../server/gika/quota';
import { claimTickReplay } from '../../server/tick-replay';
import { tickSignature, TICK_PATH } from '../../server/tick-signature';

const secret = 'goal01-emulator-only-secret';
beforeEach(async () => {
  await fetch('http://localhost:8080/emulator/v1/projects/demo-leve/databases/(default)/documents', { method: 'DELETE' });
  const users = await auth.listUsers(); if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ mode: 'normal' });
  vi.stubEnv('SCHEDULER_HMAC_SECRET', secret);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function account() {
  const user = await auth.createUser({ email: `goal01-${crypto.randomUUID()}@example.test`, emailVerified: true, password: 'emulator-only-password' });
  const signed = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'emulator-only-password', returnSecureToken: true }),
  });
  if (!signed.ok) throw new Error('Emulator sign-in failed');
  const { idToken } = await signed.json() as { idToken: string };
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, accountState: 'active', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 });
  await db.doc(`memberships/${user.uid}`).set({ state: 'active' });
  return { uid: user.uid, token: idToken };
}
function proof(milliseconds = Date.now()) {
  const timestamp = String(milliseconds);
  return { timestamp, signature: tickSignature(secret, timestamp), milliseconds };
}
function tick(value = proof()) { return request(app).post(TICK_PATH).set('x-leve-timestamp', value.timestamp).set('x-leve-signature', value.signature); }

describe('GOAL01 durable recovery quota with real Firestore transactions', () => {
  it('serializes claims from independent consumers, keeps UIDs isolated, and survives consumer restart', async () => {
    const first = createGikaRecoveryQuota(), second = createGikaRecoveryQuota();
    const start = Date.UTC(2026, 9, 5, 12);
    const results = await Promise.allSettled(Array.from({ length: 16 }, (_, index) => (index % 2 ? first : second)('recovery-account-a', start)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(12);
    const failures = results.filter(result => result.status === 'rejected');
    expect(failures).toHaveLength(4);
    for (const result of failures) if (result.status === 'rejected') expect(result.reason).toMatchObject({ code: 'GIKA_QUOTA' });
    await expect(createGikaRecoveryQuota()('recovery-account-a', start + 9_999)).rejects.toMatchObject({ code: 'GIKA_QUOTA' });
    await second('recovery-account-b', start);
    const bucket = (await db.doc('usageBuckets/recovery-account-a_gika_recovery').get()).data();
    expect(bucket).toMatchObject({ requestTimesMs: Array(12).fill(start), dayCount: 12 });
    expect((await db.doc('usageBuckets/recovery-account-a_gika').get()).exists).toBe(false);
    await first('recovery-account-a', start + 10_000);
  });

  it('protects receipt endpoints with shared quota and fails before receipt queries on store outage', async () => {
    const user = await account(), body = { requestId: crypto.randomUUID(), text: 'Pedido sintético' };
    for (let index = 0; index < 12; index++) await request(app).post(index % 2 ? '/api/gika/recover-batch' : '/api/gika/recover-confirmation').set('Authorization', `Bearer ${user.token}`).send(body).expect(409);
    for (const path of ['/respond', '/recover-confirmation', '/recover-batch', '/choose-recurrence']) {
      const denied = await request(app).post(`/api/gika${path}`).set('Authorization', `Bearer ${user.token}`).send({ ...body,
        ...(path === '/choose-recurrence' ? { token: `test.${'a'.repeat(64)}`, scope: 'occurrence' } : {}) }).expect(429);
      expect(denied.body.code).toBe('GIKA_QUOTA');
    }
    const other = await account();
    const receiptQueries = vi.spyOn(db, 'collection');
    vi.spyOn(db, 'runTransaction').mockRejectedValueOnce(new Error('Synthetic recovery store outage'));
    const unavailable = await request(app).post('/api/gika/recover-batch').set('Authorization', `Bearer ${other.token}`).send(body).expect(503);
    expect(unavailable.body.code).toBe('GIKA_UNAVAILABLE');
    expect(receiptQueries).not.toHaveBeenCalled();
    expect((await db.doc(`usageBuckets/${other.uid}_gika_recovery`).get()).exists).toBe(false);
  });
});

describe('GOAL01 signed tick replay claim with real Firestore transactions', () => {
  it('admits exactly one concurrent signature claim and rejects API replay before any job queries', async () => {
    const value = proof();
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => claimTickReplay(value)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    for (const result of results) if (result.status === 'rejected') expect(result.reason).toMatchObject({ code: 'TICK_REPLAY', status: 409 });
    const queries = vi.spyOn(db, 'collection');
    const replayed = await tick(value).expect(409);
    expect(replayed.body.code).toBe('TICK_REPLAY'); expect(queries).not.toHaveBeenCalled();
    expect((await db.doc('maintenance/internalTickReplay').get()).data()?.claims).toHaveLength(1);
  });

  it('accepts one of two HTTP ticks with the same signed proof and runs the scheduler once', async () => {
    const value = proof();
    const responses = await Promise.all([tick(value), tick(value)]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const accepted = responses.find(response => response.status === 200)!;
    expect(accepted.body).toHaveProperty('reminders');
    expect((await db.doc('maintenance/internalTickReplay').get()).data()?.claims).toHaveLength(1);
    expect((await db.doc('maintenance/defaultReminderBackfillV4').get()).exists).toBe(true);
  });

  it('never releases an accepted proof after partial job failure; a newly signed tick can recover', async () => {
    const value = proof();
    vi.spyOn(db, 'collectionGroup').mockImplementationOnce(() => { throw new Error('Synthetic first job failure'); });
    await tick(value).expect(503);
    const queries = vi.spyOn(db, 'collection');
    await tick(value).expect(409); expect(queries).not.toHaveBeenCalled();
    await tick(proof(value.milliseconds + 1)).expect(200);
    expect((await db.doc('maintenance/internalTickReplay').get()).data()?.claims).toHaveLength(2);
  });

  it('rejects malformed/expired authentication without claims and fails closed on claim-store outage', async () => {
    const queries = vi.spyOn(db, 'collection');
    const claims = vi.spyOn(db, 'runTransaction');
    await request(app).post(TICK_PATH).expect(401);
    await tick({ ...proof(), signature: 'a'.repeat(64) }).expect(401);
    await tick(proof(Date.now() - 300_001)).expect(401);
    expect(claims).not.toHaveBeenCalled(); expect(queries).not.toHaveBeenCalled();
    claims.mockRejectedValueOnce(new Error('Synthetic replay store outage'));
    await tick().expect(503); expect(queries).not.toHaveBeenCalled();
    expect((await db.doc('maintenance/internalTickReplay').get()).exists).toBe(false);
  });
});
