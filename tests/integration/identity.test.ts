import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { app } from '../../server/app';
import { auth, db } from '../../server/platform/firebase';
import { hashValue } from '../../server/commands/identity';

const projectId = 'demo-leve';
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const profile = { displayName: 'Conta de teste', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', weekStartsOn: 1, reduceTransparency: false };
let rules: RulesTestEnvironment;

async function createUser(email: string, verified = true) {
  const user = await auth.createUser({ email, emailVerified: verified, password: 'teste-seguro-123' });
  const response = await fetch(`${authBase}/accounts:signInWithPassword?key=local-test`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'teste-seguro-123', returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Falha ao autenticar usuário de teste: ${response.status}`);
  const body = await response.json() as { idToken: string };
  return { uid: user.uid, token: body.idToken };
}

async function seedAccount(uid: string, state: 'active' | 'suspended' = 'active') {
  const now = new Date().toISOString();
  await Promise.all([
    db.doc(`memberships/${uid}`).set({ state, createdAt: now }),
    db.doc(`users/${uid}`).set({ ...profile, uid, schemaVersion: 1, revision: 1, dataVersion: 1, accountState: 'active', createdAt: now, updatedAt: now }),
  ]);
}

async function seedInvite(id: string, secret: string, email?: string) {
  await db.doc(`invites/${id}`).set({ state: 'pending', secretHash: hashValue(secret), expiresAt: new Date(Date.now() + 3600_000).toISOString(), ...(email ? { email } : {}) });
}

function command(uid: string, inviteId: string, secret: string, operationId: string) {
  return { command: 'invite.accept', operationId, entityId: uid, expectedRevision: 0, payload: { inviteId, secret, profile } };
}

function activityCommand(action: string, entityId: string, operationId: string, expectedRevision: number, payload: Record<string, unknown>) {
  return { command: `activity.${action}`, operationId, entityId, expectedRevision, clientCreatedAt: new Date().toISOString(), payload };
}

const activityPayload = { title: 'Revisar agenda', descriptionPlain: '', categoryId: null, schedule: { type: 'task', dueDate: null, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, reminderSpecs: [] };

beforeAll(async () => {
  rules = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await rules.clearFirestore();
  const users = await auth.listUsers();
  if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ admissionsOpen: true, registeredAccounts: 0, accountLimit: 5, mode: 'normal' });
});

afterAll(async () => { await rules.cleanup(); });

describe('API autenticada', () => {
  it('mantém health público e rejeita sessão sem token ou com token inválido', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    expect((await request(app).get('/api/session')).status).toBe(401);
    expect((await request(app).get('/api/session').set('authorization', 'Bearer invalido')).status).toBe(401);
  });

  it('bloqueia comando de perfil com e-mail não verificado e conta suspensa', async () => {
    const unverified = await createUser('nao-verificada@example.test', false);
    await seedAccount(unverified.uid);
    const payload = { command: 'profile.update', operationId: '10000000-0000-4000-8000-000000000001', entityId: unverified.uid, expectedRevision: 1, payload: profile };
    expect((await request(app).post('/api/commands').set('authorization', `Bearer ${unverified.token}`).send(payload)).status).toBe(403);

    const suspended = await createUser('suspensa@example.test');
    await seedAccount(suspended.uid, 'suspended');
    expect((await request(app).post('/api/commands').set('authorization', `Bearer ${suspended.token}`).send({ ...payload, entityId: suspended.uid, operationId: '10000000-0000-4000-8000-000000000002' })).status).toBe(403);
  });
});

describe('convites e admissão', () => {
  it('consome convite, cria defaults normalizados e responde retry idempotente', async () => {
    const user = await createUser('nova@example.test');
    const secret = 'segredo-de-convite-com-mais-de-vinte';
    await seedInvite('convite-a', secret, 'NOVA@example.test');
    const body = command(user.uid, 'convite-a', secret, '20000000-0000-4000-8000-000000000001');
    const first = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body).expect(200);
    expect(first.body.result).toBe('applied');
    const retry = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body).expect(200);
    expect(retry.body.result).toBe('alreadyApplied');
    expect((await db.doc(`users/${user.uid}/categories/saude`).get()).data()?.normalizedName).toBe('saúde');
    expect((await db.doc('serviceControls/global').get()).data()?.registeredAccounts).toBe(1);
  });

  it('permite somente uma vencedora na última vaga concorrente', async () => {
    await db.doc('serviceControls/global').update({ accountLimit: 1 });
    const [a, b] = await Promise.all([createUser('a@example.test'), createUser('b@example.test')]);
    await Promise.all([seedInvite('convite-a', 'segredo-concorrente-a-12345'), seedInvite('convite-b', 'segredo-concorrente-b-12345')]);
    const attempts = await Promise.all([
      request(app).post('/api/commands').set('authorization', `Bearer ${a.token}`).send(command(a.uid, 'convite-a', 'segredo-concorrente-a-12345', '30000000-0000-4000-8000-000000000001')),
      request(app).post('/api/commands').set('authorization', `Bearer ${b.token}`).send(command(b.uid, 'convite-b', 'segredo-concorrente-b-12345', '30000000-0000-4000-8000-000000000002')),
    ]);
    expect(attempts.map(result => result.status).sort()).toEqual([200, 403]);
    expect((await db.doc('serviceControls/global').get()).data()?.registeredAccounts).toBe(1);
  });
});

describe('Security Rules por uid', () => {
  it('permite leitura própria limitada e impede leitura ou escrita cruzada', async () => {
    const [a, b] = await Promise.all([createUser('rules-a@example.test'), createUser('rules-b@example.test')]);
    await Promise.all([seedAccount(a.uid), seedAccount(b.uid)]);
    await db.doc(`users/${a.uid}/categories/pessoal`).set({ name: 'Pessoal' });
    const aDb = rules.authenticatedContext(a.uid, { email_verified: true }).firestore();
    await expect(getDoc(doc(aDb, 'users', a.uid))).resolves.toBeDefined();
    await expect(getDocs(query(collection(aDb, `users/${a.uid}/categories`), limit(50)))).resolves.toBeDefined();
    await expect(getDoc(doc(aDb, 'users', b.uid))).rejects.toThrow();
    await expect(getDoc(doc(aDb, 'memberships', b.uid))).rejects.toThrow();
    await expect(setDoc(doc(aDb, `users/${a.uid}/categories/nova`), { name: 'Nova' })).rejects.toThrow();
  });
});

describe('comandos de conteúdo', () => {
  it('aplica criação uma vez e detecta reutilização ou revisão divergente', async () => {
    const user = await createUser('conteudo@example.test');
    await seedAccount(user.uid);
    const create = activityCommand('create', 'atividade-a', '40000000-0000-4000-8000-000000000001', 0, activityPayload);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(create).expect(200);
    expect((await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(create)).body.result).toBe('alreadyApplied');
    const mismatch = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send({ ...create, payload: { ...activityPayload, title: 'Outro título' } });
    expect(mismatch.status).toBe(409); expect(mismatch.body.code).toBe('OPERATION_MISMATCH');
    const conflict = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('update', 'atividade-a', '40000000-0000-4000-8000-000000000002', 0, activityPayload));
    expect(conflict.status).toBe(409); expect(conflict.body.code).toBe('REVISION_CONFLICT');
  });

  it('impede restauração vencida ou sem prazo explícito', async () => {
    const user = await createUser('lixeira@example.test');
    await seedAccount(user.uid);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('create', 'atividade-lixeira', '50000000-0000-4000-8000-000000000001', 0, activityPayload)).expect(200);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('trash', 'atividade-lixeira', '50000000-0000-4000-8000-000000000002', 1, {})).expect(200);
    await db.doc(`users/${user.uid}/activities/atividade-lixeira`).update({ purgeAfter: new Date(Date.now() - 1000).toISOString() });
    const expired = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('restore', 'atividade-lixeira', '50000000-0000-4000-8000-000000000003', 2, {}));
    expect(expired.status).toBe(409); expect(expired.body.code).toBe('ENTITY_UNAVAILABLE');
  });

  it('rejeita atividade vinculada a categoria arquivada', async () => {
    const user = await createUser('referencia@example.test');
    await seedAccount(user.uid);
    const category = { command: 'category.create', operationId: '60000000-0000-4000-8000-000000000001', entityId: 'categoria-a', expectedRevision: 0, payload: { name: 'Trabalho', colorHex: '#86A5C6', sortOrder: 1 } };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(category).expect(200);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send({ command: 'category.archive', operationId: '60000000-0000-4000-8000-000000000002', entityId: 'categoria-a', expectedRevision: 1, payload: {} }).expect(200);
    const result = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('create', 'atividade-ref', '60000000-0000-4000-8000-000000000003', 0, { ...activityPayload, categoryId: 'categoria-a' }));
    expect(result.status).toBe(422); expect(result.body.code).toBe('REFERENCE_UNAVAILABLE');
  });
});
