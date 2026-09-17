import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { app } from '../../server/app';
import { auth, db } from '../../server/platform/firebase';

const projectId = 'demo-leve';
const authBase = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const baseProfile = {
  displayName: 'Conta sazonal',
  locale: 'pt-BR' as const,
  weekStartsOn: 1 as const,
  reduceTransparency: false,
};

let rules: RulesTestEnvironment;

async function createVerifiedUser(email: string) {
  const user = await auth.createUser({ email, emailVerified: true, password: 'teste-seguro-123' });
  const response = await fetch(`${authBase}/accounts:signInWithPassword?key=local-test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'teste-seguro-123', returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Falha ao autenticar usuário sazonal de teste: ${response.status}`);
  const body = await response.json() as { idToken: string };
  return { uid: user.uid, token: body.idToken };
}

async function seedActiveAccount(uid: string) {
  const now = new Date().toISOString();
  await Promise.all([
    db.doc(`memberships/${uid}`).set({ state: 'active', createdAt: now }),
    db.doc(`users/${uid}`).set({
      ...baseProfile,
      seasonalDetailsEnabled: true,
      timeZone: 'America/Sao_Paulo',
      uid,
      schemaVersion: 1,
      revision: 1,
      dataVersion: 1,
      accountState: 'active',
      createdAt: now,
      updatedAt: now,
    }),
    db.doc(`users/${uid}/internal/counts`).set({
      activities: 0,
      notes: 0,
      shoppingLists: 0,
      categories: 0,
      series: 0,
      notificationDevices: 0,
    }),
  ]);
}

beforeAll(async () => {
  rules = await initializeTestEnvironment({
    projectId,
    firestore: { host: 'localhost', port: 8080, rules: await readFile('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await rules.clearFirestore();
  const users = await auth.listUsers();
  if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ admissionsOpen: true, registeredAccounts: 0, accountLimit: 5, mode: 'normal' });
});

afterAll(async () => { await rules.cleanup(); });

describe('preferência sazonal persistente', () => {
  it('persiste opt-out, preserva-o em cliente legado e inclui a escolha na exportação', async () => {
    const user = await createVerifiedUser('seasonal-profile@example.test');
    await seedActiveAccount(user.uid);

    const disable = {
      command: 'profile.update',
      operationId: 'a1000000-0000-4000-8000-000000000001',
      entityId: user.uid,
      expectedRevision: 1,
      payload: { ...baseProfile, seasonalDetailsEnabled: false },
    };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(disable).expect(200);
    expect((await db.doc(`users/${user.uid}`).get()).data()).toMatchObject({ seasonalDetailsEnabled: false, revision: 2 });

    const legacyUpdate = {
      command: 'profile.update',
      operationId: 'a1000000-0000-4000-8000-000000000002',
      entityId: user.uid,
      expectedRevision: 2,
      payload: { ...baseProfile, displayName: 'Conta sazonal atualizada' },
    };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(legacyUpdate).expect(200);
    expect((await db.doc(`users/${user.uid}`).get()).data()).toMatchObject({
      displayName: 'Conta sazonal atualizada',
      seasonalDetailsEnabled: false,
      revision: 3,
    });

    const exported = await request(app).get('/api/account/export').set('authorization', `Bearer ${user.token}`).expect(200);
    expect(exported.body.profile.seasonalDetailsEnabled).toBe(false);
  });

  it('ativa contas novas com detalhes sazonais ligados quando o cliente não envia a preferência', async () => {
    const user = await createVerifiedUser('seasonal-default@example.test');
    const activation = {
      command: 'account.activate',
      operationId: 'a2000000-0000-4000-8000-000000000001',
      entityId: user.uid,
      expectedRevision: 0,
      payload: { profile: baseProfile },
    };

    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activation).expect(200);
    expect((await db.doc(`users/${user.uid}`).get()).data()?.seasonalDetailsEnabled).toBe(true);
  });
});
