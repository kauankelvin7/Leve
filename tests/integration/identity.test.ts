import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { app } from '../../server/app';
import { auth, db } from '../../server/platform/firebase';
import { hashCanonicalValue, hashValue } from '../../server/hash';
import { processReminderTick } from '../../server/reminders';

const projectId = 'demo-leve';
const authBase = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
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

function activationCommand(uid: string, operationId: string) {
  return { command: 'account.activate', operationId, entityId: uid, expectedRevision: 0, payload: { profile } };
}

function activityCommand(action: string, entityId: string, operationId: string, expectedRevision: number, payload: Record<string, unknown>) {
  return { command: `activity.${action}`, operationId, entityId, expectedRevision, clientCreatedAt: new Date().toISOString(), payload };
}

function contentCommand(commandName: string, entityId: string, operationId: string, expectedRevision: number, payload: Record<string, unknown>) {
  return { command: commandName, operationId, entityId, expectedRevision, clientCreatedAt: new Date().toISOString(), payload };
}

const activityPayload = { title: 'Revisar agenda', descriptionPlain: '', categoryId: null, schedule: { type: 'task', dueDate: null, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, reminderSpecs: [] };

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

describe('API autenticada', () => {
  it('importa dois lotes concorrentes sem duplicar entidades nem reservas', async () => {
    const user = await createUser('import-concurrent@example.test');
    await seedAccount(user.uid);
    const archive = { format: 'leve-account-export', version: 1, exportedAt: new Date().toISOString(), profile,
      data: { categories: [], series: [], notes: [], shoppingLists: [], activities: Array.from({ length: 401 }, (_, index) => ({ ...activityPayload, id: `source-${index}` })) } };
    const importId = '90000000-0000-4000-8000-000000000002';
    const body = contentCommand('account.import', importId, '90000000-0000-4000-8000-000000000001', 0, { importId, archive });
    const responses = await Promise.all([1, 2].map(() => request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body)));
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(401);
    expect((await db.doc(`users/${user.uid}/internal/counts`).get()).data()).toMatchObject({ activities: 401, reserved_activities: 0 });
    expect((await db.doc(`users/${user.uid}/imports/${importId}`).get()).data()).toMatchObject({ state: 'completed', cursor: 401 });
    expect((await db.doc('serviceControls/global').get()).data()?.activeImports).toBe(0);
  });

  it('retoma uma importação interrompida e remapeia todos os vínculos', async () => {
    const user = await createUser('import-resume@example.test');
    await seedAccount(user.uid);
    const archive = { format: 'leve-account-export', version: 1, exportedAt: new Date().toISOString(), profile,
      data: {
        categories: [{ id: 'category-source', name: 'Pessoal', colorHex: '#557755', sortOrder: 0 }],
        activities: [{ ...activityPayload, id: 'activity-source', categoryId: 'category-source', seriesId: 'series-source', occurrenceKey: '2026-09-12', status: 'pending' }],
        series: [{ id: 'series-source', activity: { ...activityPayload, categoryId: 'category-source', schedule: { ...activityPayload.schedule, dueDate: '2026-09-12' } }, recurrence: { frequency: 'weekly', interval: 1, until: null, count: 4, monthlyPolicy: 'lastDay' }, state: 'active', materializedCount: 1, materializedThrough: '2026-09-12', previousSeriesId: null }],
        notes: [{ id: 'note-source', title: 'Nota', bodyDoc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto' }] }] }, paperColorPreset: 'butter', pinned: true, linkedDate: '2026-09-12', linkedActivityIds: ['activity-source'] }],
        shoppingLists: [{ id: 'list-source', title: 'Modelo', listKind: 'template', cycleKey: null, sourceTemplateId: null, items: [{ id: 'item-source', listId: 'list-source', name: 'Arroz', quantityValue: 2, unit: 'pacote', unitLabel: '', detail: '', sortOrder: 0, checked: false }] }],
      } };
    const importId = '91000000-0000-4000-8000-000000000002';
    const digest = hashCanonicalValue(archive);
    await Promise.all([
      db.doc(`users/${user.uid}/imports/${importId}`).set({ state: 'prepared', digest, sourceExportedAt: archive.exportedAt, entityCount: 5, cursor: 0, reservedCounts: { categories: 1, activities: 1, series: 1, notes: 1, shoppingLists: 1 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      db.doc(`users/${user.uid}/internal/counts`).set({ activeImportId: importId, reserved_categories: 1, reserved_activities: 1, reserved_series: 1, reserved_notes: 1, reserved_shoppingLists: 1 }),
      db.doc('serviceControls/global').update({ activeImports: 1 }),
    ]);
    const body = contentCommand('account.import', importId, '91000000-0000-4000-8000-000000000001', 0, { importId, archive });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body).expect(200);
    const importedActivity = (await db.collection(`users/${user.uid}/activities`).get()).docs[0]!.data();
    const importedSeries = (await db.collection(`users/${user.uid}/series`).get()).docs[0]!.data();
    const importedNote = (await db.collection(`users/${user.uid}/notes`).get()).docs[0]!.data();
    const importedList = (await db.collection(`users/${user.uid}/shoppingLists`).get()).docs[0]!;
    expect(importedActivity.categoryId).not.toBe('category-source');
    expect(importedActivity.seriesId).toBe((await db.collection(`users/${user.uid}/series`).get()).docs[0]!.id);
    expect(importedSeries.activity.categoryId).toBe(importedActivity.categoryId);
    expect(importedNote.linkedActivityIds).toEqual([(await db.collection(`users/${user.uid}/activities`).get()).docs[0]!.id]);
    expect((await importedList.ref.collection('items').get()).docs[0]!.data().listId).toBe(importedList.id);
    expect((await db.doc(`users/${user.uid}/internal/counts`).get()).data()).toMatchObject({ categories: 1, activities: 1, series: 1, notes: 1, shoppingLists: 1, reserved_categories: 0, reserved_activities: 0, reserved_series: 0, reserved_notes: 0, reserved_shoppingLists: 0 });
    expect((await db.doc('serviceControls/global').get()).data()?.activeImports).toBe(0);
  });

  it('limita uma importação por conta e duas globalmente', async () => {
    const users = await Promise.all(['a', 'b', 'c'].map(name => createUser(`bulk-${name}@example.test`)));
    await Promise.all(users.map(user => seedAccount(user.uid)));
    const archive = { format: 'leve-account-export', version: 1, exportedAt: new Date().toISOString(), profile, data: { categories: [], activities: [], series: [], notes: [], shoppingLists: [] } };
    await Promise.all(users.slice(0, 2).map((user, index) => Promise.all([
      db.doc(`users/${user.uid}/imports/92000000-0000-4000-8000-00000000000${index + 1}`).set({ state: 'prepared', digest: hashValue(JSON.stringify(archive)), cursor: 0 }),
      db.doc(`users/${user.uid}/internal/counts`).set({ activeImportId: `92000000-0000-4000-8000-00000000000${index + 1}` }),
    ])));
    await db.doc('serviceControls/global').update({ activeImports: 2 });
    const thirdId = '92000000-0000-4000-8000-000000000003';
    const blockedGlobal = await request(app).post('/api/commands').set('authorization', `Bearer ${users[2]!.token}`).send(contentCommand('account.import', thirdId, '92000000-0000-4000-8000-000000000010', 0, { importId: thirdId, archive }));
    expect(blockedGlobal.status).toBe(429); expect(blockedGlobal.body.code).toBe('BULK_CAPACITY');

    await db.doc('serviceControls/global').update({ activeImports: 1 });
    const otherId = '92000000-0000-4000-8000-000000000099';
    const blockedAccount = await request(app).post('/api/commands').set('authorization', `Bearer ${users[0]!.token}`).send(contentCommand('account.import', otherId, '92000000-0000-4000-8000-000000000011', 0, { importId: otherId, archive }));
    expect(blockedAccount.status).toBe(409); expect(blockedAccount.body.code).toBe('IMPORT_ACTIVE');
  });

  it('libera a capacidade global quando a conta é excluída durante uma importação preparada', async () => {
    const user = await createUser('delete-import@example.test');
    await seedAccount(user.uid);
    const importId = '93000000-0000-4000-8000-000000000001';
    await Promise.all([
      db.doc(`users/${user.uid}/imports/${importId}`).set({ state: 'prepared', digest: 'digest', cursor: 0 }),
      db.doc(`users/${user.uid}/internal/counts`).set({ activeImportId: importId, reserved_activities: 10 }),
      db.doc('serviceControls/global').update({ activeImports: 1 }),
    ]);
    const deletion = contentCommand('account.delete', user.uid, '93000000-0000-4000-8000-000000000002', 1, { confirmation: 'EXCLUIR' });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(deletion).expect(200);
    expect((await db.doc('serviceControls/global').get()).data()?.activeImports).toBe(0);
    expect((await db.doc(`accountDeletionJobs/${user.uid}`).get()).data()?.state).toBe('completed');
    expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(false);
  });
  it('mantém health público e rejeita sessão sem token ou com token inválido', async () => {
    const health = await request(app).get('/api/health').expect(200);
    expect(health.body.status).toBe('ok');
    expect(health.body).toEqual({ status: 'ok' });
    const version = await request(app).get('/api/version').expect(200);
    expect(version.body.release).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$|^stable$/);
    expect(JSON.stringify(version.body)).not.toContain('VERCEL_');
    expect((await request(app).get('/api/session')).status).toBe(401);
    const invalid = await request(app).get('/api/session').set('authorization', 'Bearer invalido');
    expect(invalid.status).toBe(401);
    expect(invalid.body).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Sua sessão expirou. Entre novamente.',
      correlationId: expect.any(String),
    });
    expect(invalid.headers['x-correlation-id']).toBe(invalid.body.correlationId);
    expect(JSON.stringify(invalid.body)).not.toMatch(/auth\/|stack|Firebase/i);
  });

  it('persiste cor individual e conclusão idempotente do tutorial sem alterar preferências', async () => {
    const user = await createUser('cores-tutorial@example.test'); await seedAccount(user.uid);
    const command = activityCommand('create', 'colorida', crypto.randomUUID(), 0, { ...activityPayload, colorHex: '#CE92A5' });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(command).expect(200);
    expect((await db.doc(`users/${user.uid}/activities/colorida`).get()).data()?.colorHex).toBe('#CE92A5');
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send({ ...command, entityId: 'invalida', operationId: crypto.randomUUID(), payload: { ...activityPayload, colorHex: 'url(evil)' } }).expect(422);
    const complete = { command: 'profile.completeTutorial', entityId: user.uid, operationId: crypto.randomUUID(), payload: {} };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(complete).expect(200);
    const first = (await db.doc(`users/${user.uid}`).get()).data()!;
    const retry = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(complete).expect(200);
    expect(retry.body.result).toBe('alreadyApplied');
    expect((await db.doc(`users/${user.uid}`).get()).data()).toEqual(first);
    expect(first.displayName).toBe(profile.displayName);
  });

  it('esvazia em lotes somente a lixeira confirmada da própria conta', async () => {
    const user = await createUser('lixeira-lotes@example.test'); const other = await createUser('lixeira-outra@example.test');
    await Promise.all([seedAccount(user.uid), seedAccount(other.uid)]);
    const cutoff = new Date(Date.now() - 1000).toISOString(); const old = new Date(Date.now() - 5000).toISOString();
    await Promise.all(Array.from({ length: 23 }, (_, index) => db.doc(`users/${user.uid}/activities/trash-${index}`).set({ ...activityPayload, deletedAt: old, revision: 1 })));
    await db.doc(`users/${user.uid}/activities/new-trash`).set({ ...activityPayload, deletedAt: new Date().toISOString(), revision: 1 });
    await db.doc(`users/${user.uid}/activities/active`).set({ ...activityPayload, deletedAt: null, revision: 1 });
    await db.doc(`users/${other.uid}/activities/private`).set({ ...activityPayload, deletedAt: old, revision: 1 });
    const command = { command: 'trash.empty', entityId: user.uid, operationId: crypto.randomUUID(), payload: { cutoff } };
    const first = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(command).expect(200);
    expect(first.body).toEqual({ removed: 20, more: true });
    const second = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(command).expect(200);
    expect(second.body).toEqual({ removed: 3, more: false });
    const retry = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(command).expect(200);
    expect(retry.body.removed).toBe(0);
    expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(2);
    expect((await db.doc(`users/${other.uid}/activities/private`).get()).exists).toBe(true);
    await request(app).post('/api/commands').set('authorization', `Bearer ${other.token}`).send(command).expect(403);
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

describe('ativação de conta', () => {
  it('cria defaults normalizados e responde retry idempotente na ativação', async () => {
    const user = await createUser('nova@example.test');
    const body = activationCommand(user.uid, '20000000-0000-4000-8000-000000000001');
    const first = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body).expect(200);
    expect(first.body.result).toBe('applied');
    const retry = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(body).expect(200);
    expect(retry.body.result).toBe('alreadyApplied');
    expect((await db.doc(`users/${user.uid}/categories/saude`).get()).data()?.normalizedName).toBe('saúde');
  });

  it('ativa contas concorrentes sem compartilhar dados', async () => {
    const [a, b] = await Promise.all([createUser('a@example.test'), createUser('b@example.test')]);
    const attempts = await Promise.all([
      request(app).post('/api/commands').set('authorization', `Bearer ${a.token}`).send(activationCommand(a.uid, '30000000-0000-4000-8000-000000000001')),
      request(app).post('/api/commands').set('authorization', `Bearer ${b.token}`).send(activationCommand(b.uid, '30000000-0000-4000-8000-000000000002')),
    ]);
    expect(attempts.map(result => result.status).sort()).toEqual([200, 200]);
    expect((await db.doc(`memberships/${a.uid}`).get()).data()?.state).toBe('active');
    expect((await db.doc(`memberships/${b.uid}`).get()).data()?.state).toBe('active');
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
  it('registra tempo com exclusividade, revisão e encerramento persistente', async () => {
    const user = await createUser('tempo@example.test');
    await seedAccount(user.uid);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(activityCommand('create', 'atividade-tempo', '39000000-0000-4000-8000-000000000001', 0, { ...activityPayload, estimatedMinutes: 30 })).expect(200);
    const start = contentCommand('timeEntry.start', 'tempo-a', '39000000-0000-4000-8000-000000000002', 0, { activityId: 'atividade-tempo', civilDate: '2026-09-14', timeZone: 'America/Sao_Paulo' });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(start).expect(200);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('timeEntry.start', 'tempo-b', '39000000-0000-4000-8000-000000000003', 0, { activityId: 'atividade-tempo', civilDate: '2026-09-14', timeZone: 'America/Sao_Paulo' })).expect(200);
    const stored = (await db.doc(`users/${user.uid}/timeEntries/tempo-a`).get()).data()!;
    expect(stored.endedAt).toEqual(expect.any(String)); expect(stored.durationSeconds).toBeGreaterThanOrEqual(1); expect(stored.revision).toBe(2);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('timeEntry.stop', 'tempo-b', '39000000-0000-4000-8000-000000000004', 1, {})).expect(200);
    expect((await db.doc(`users/${user.uid}/internal/activeTimer`).get()).exists).toBe(false);
    const sessionId = '39000000-0000-4000-8000-000000000005';
    const sessionPayload = { activityId: 'atividade-tempo', civilDate: '2026-09-14', timeZone: 'America/Sao_Paulo', durationSeconds: 47 * 60, sessionId };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('timeEntry.addSession', sessionId, '39000000-0000-4000-8000-000000000006', 0, sessionPayload)).expect(200);
    const repeated = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('timeEntry.addSession', sessionId, '39000000-0000-4000-8000-000000000007', 0, sessionPayload));
    expect(repeated.status).toBe(409); expect(repeated.body.code).toBe('REVISION_CONFLICT');
    expect((await db.doc(`users/${user.uid}/timeEntries/${sessionId}`).get()).data()?.source).toBe('session');
  });

  it('permite concluir e reabrir compromisso de dia inteiro', async () => {
    const user = await createUser('dia-inteiro@example.test');
    await seedAccount(user.uid);
    const eventPayload = {
      ...activityPayload,
      title: 'Evento de dia inteiro',
      schedule: {
        type: 'event',
        allDay: true,
        startDate: '2026-09-20',
        endDateExclusive: '2026-09-21',
        timeZone: 'America/Sao_Paulo',
      },
    };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(
      activityCommand('create', 'evento-dia-inteiro', '39100000-0000-4000-8000-000000000001', 0, eventPayload),
    ).expect(200);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(
      activityCommand('setStatus', 'evento-dia-inteiro', '39100000-0000-4000-8000-000000000002', 1, { status: 'completed' }),
    ).expect(200);
    const completed = (await db.doc(`users/${user.uid}/activities/evento-dia-inteiro`).get()).data()!;
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toEqual(expect.any(String));

    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(
      activityCommand('setStatus', 'evento-dia-inteiro', '39100000-0000-4000-8000-000000000003', 2, { status: 'pending' }),
    ).expect(200);
    const reopened = (await db.doc(`users/${user.uid}/activities/evento-dia-inteiro`).get()).data()!;
    expect(reopened.status).toBe('pending');
    expect(reopened.completedAt).toBeNull();
  });

  it('mantém isolamento com vinte contas gravando simultaneamente', async () => {
    const users = await Promise.all(Array.from({ length: 20 }, (_, index) => createUser(`carga-${index}@example.test`)));
    await Promise.all(users.map(user => seedAccount(user.uid)));
    const startedAt = Date.now();
    const responses = await Promise.all(users.map((user, index) => request(app)
      .post('/api/commands')
      .set('authorization', `Bearer ${user.token}`)
      .send(activityCommand('create', `atividade-carga-${index}`, `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`, 0, { ...activityPayload, title: `Atividade da conta ${index}` }))));
    expect(responses.every(response => response.status === 200)).toBe(true);
    const snapshots = await Promise.all(users.map((user, index) => db.doc(`users/${user.uid}/activities/atividade-carga-${index}`).get()));
    expect(snapshots.every((snapshot, index) => snapshot.data()?.title === `Atividade da conta ${index}`)).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(20_000);
  }, 60_000);

  it('recupera um lease vencido uma única vez entre ticks concorrentes', async () => {
    const user = await createUser('lease-concorrente@example.test');
    await seedAccount(user.uid);
    const now = Date.now();
    const job = db.doc('reminderJobs/lease-concorrente');
    await job.set({
      uid: user.uid,
      activityId: 'atividade-ausente',
      activityRevision: 1,
      reminderSpecId: 'principal',
      scheduledAt: new Date(now - 120_000).toISOString(),
      nextAttemptAt: new Date(now - 120_000).toISOString(),
      deliveryWindowEnd: new Date(now + 120_000).toISOString(),
      state: 'processing',
      attempts: 0,
      leaseId: 'lease-antigo',
      leaseUntil: new Date(now - 60_000).toISOString(),
      createdAt: new Date(now - 180_000).toISOString(),
      updatedAt: new Date(now - 60_000).toISOString(),
    });

    const results = await Promise.all([processReminderTick(), processReminderTick()]);
    expect(results.reduce((total, result) => total + result.reclaimed, 0)).toBe(1);
    expect((await job.get()).data()).toMatchObject({ state: 'obsolete', leaseId: null, leaseUntil: null });
  });

  it('não reenvia entrega incerta e agenda retry apenas para rejeição confirmada', async () => {
    const user = await createUser('entrega-lembrete@example.test');
    await seedAccount(user.uid);
    const now = Date.now();
    const activityId = 'atividade-lembrete';
    await db.doc(`users/${user.uid}/activities/${activityId}`).set({
      ...activityPayload,
      kind: 'task',
      status: 'pending',
      revision: 1,
      deletedAt: null,
      createdAt: new Date(now - 60_000).toISOString(),
      updatedAt: new Date(now - 60_000).toISOString(),
    });
    await db.doc('notificationTokens/token-lembrete').set({
      uid: user.uid,
      deviceId: 'aparelho-a',
      token: 'token-ficticio',
      state: 'active',
      createdAt: new Date(now - 60_000).toISOString(),
      updatedAt: new Date(now - 60_000).toISOString(),
    });
    async function createJob(id: string) {
      const ref = db.doc(`reminderJobs/${id}`);
      await ref.set({
        uid: user.uid,
        activityId,
        activityRevision: 1,
        reminderSpecId: id,
        scheduledAt: new Date(now - 1_000).toISOString(),
        nextAttemptAt: new Date(now - 1_000).toISOString(),
        deliveryWindowEnd: new Date(now + 600_000).toISOString(),
        state: 'pending',
        attempts: 0,
        createdAt: new Date(now - 60_000).toISOString(),
        updatedAt: new Date(now - 60_000).toISOString(),
      });
      return ref;
    }

    const uncertain = await createJob('entrega-incerta');
    await processReminderTick(async () => { throw new Error('Conexão encerrada após o envio.'); });
    expect((await uncertain.get()).data()).toMatchObject({
      state: 'unknown',
      attempts: 0,
      failureCode: 'UNCERTAIN_DELIVERY',
      leaseId: null,
      leaseUntil: null,
    });

    const rejected = await createJob('entrega-rejeitada');
    await processReminderTick(async () => ({
      successCount: 0,
      responses: [{ success: false, error: { code: 'messaging/internal-error' } }],
    }));
    const retried = (await rejected.get()).data()!;
    expect(retried).toMatchObject({ state: 'pending', attempts: 1, failureCode: 'messaging/internal-error', leaseId: null, leaseUntil: null });
    expect(retried.nextAttemptAt > new Date(now).toISOString()).toBe(true);
    await rejected.update({ state: 'failed' });
    await db.doc('notificationTokens/token-segundo').set({ uid: user.uid, deviceId: 'aparelho-b', token: 'token-ficticio-b', state: 'active' });
    const partial = await createJob('entrega-parcial');
    let acceptedToken = '';
    await processReminderTick(async message => {
      acceptedToken = message.tokens[0]!;
      return { successCount: 1, responses: [{ success: true }, { success: false, error: { code: 'messaging/internal-error' } }] };
    });
    expect((await partial.get()).data()).toMatchObject({ state: 'pending', attempts: 1 });
    await partial.update({ nextAttemptAt: new Date(now - 1000).toISOString() });
    await processReminderTick(async message => {
      expect(message.tokens).toHaveLength(1); expect(message.tokens).not.toContain(acceptedToken);
      return { successCount: 1, responses: [{ success: true }] };
    });
    expect((await partial.get()).data()?.state).toBe('sent');
  });

  it('materializa recorrência somente na janela e cria os lembretes correspondentes', async () => {
    const user = await createUser('recorrencia@example.test');
    await seedAccount(user.uid);
    const startDate = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
    const recurring = contentCommand('activity.createSeries', 'serie-a', '94000000-0000-4000-8000-000000000001', 0, {
      activity: { ...activityPayload, schedule: { ...activityPayload.schedule, dueDate: startDate, dueTime: '12:00' }, reminderSpecs: [{ id: 'principal', minutesBefore: 0 }] },
      recurrence: { frequency: 'daily', interval: 1, until: null, count: 100, monthlyPolicy: 'lastDay' },
    });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(recurring).expect(200);
    const occurrences = await db.collection(`users/${user.uid}/activities`).orderBy('occurrenceKey').get();
    const jobs = await db.collection('reminderJobs').where('uid', '==', user.uid).get();
    expect(occurrences.size).toBeGreaterThan(1);
    expect(occurrences.size).toBeLessThanOrEqual(46);
    expect(occurrences.docs.at(-1)!.data().occurrenceKey <= horizon).toBe(true);
    expect(jobs.size).toBe(occurrences.size);
    expect(jobs.docs.every(job => job.data().activityRevision === 1 && job.data().state === 'pending')).toBe(true);
  });

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

  it('edita listas e itens com revisao esperada, conflito visivel e restauracao de item', async () => {
    const user = await createUser('compras@example.test');
    await seedAccount(user.uid);
    const listPayload = { title: 'Mercado', listKind: 'regular', cycleKey: null };
    const itemPayload = { listId: 'lista-a', name: 'Arroz', quantityValue: null, unit: 'un', unitLabel: '', detail: '', sortOrder: 0 };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingList.create', 'lista-a', '70000000-0000-4000-8000-000000000001', 0, listPayload)).expect(200);
    const listUpdate = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingList.update', 'lista-a', '70000000-0000-4000-8000-000000000002', 1, { ...listPayload, title: 'Mercado do mes' })).expect(200);
    expect(listUpdate.body.revision).toBe(2);
    const listConflict = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingList.update', 'lista-a', '70000000-0000-4000-8000-000000000003', 1, { ...listPayload, title: 'Rascunho antigo' }));
    expect(listConflict.status).toBe(409); expect(listConflict.body.code).toBe('REVISION_CONFLICT');

    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.create', 'item-a', '70000000-0000-4000-8000-000000000004', 0, itemPayload)).expect(200);
    const itemUpdate = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.update', 'item-a', '70000000-0000-4000-8000-000000000005', 1, { ...itemPayload, name: 'Arroz integral', quantityValue: 2, unit: 'pacote' })).expect(200);
    expect(itemUpdate.body.revision).toBe(2);
    const itemConflict = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.update', 'item-a', '70000000-0000-4000-8000-000000000006', 1, { ...itemPayload, name: 'Feijao' }));
    expect(itemConflict.status).toBe(409); expect(itemConflict.body.code).toBe('REVISION_CONFLICT');

    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.trash', 'item-a', '70000000-0000-4000-8000-000000000007', 2, { listId: 'lista-a' })).expect(200);
    const restore = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.restore', 'item-a', '70000000-0000-4000-8000-000000000008', 3, { listId: 'lista-a' })).expect(200);
    expect(restore.body.revision).toBe(4);
    expect((await db.doc(`users/${user.uid}/shoppingLists/lista-a/items/item-a`).get()).data()?.deletedAt).toBeNull();
  });

  it('cria um ciclo idempotente a partir de um modelo sem alterar seus itens', async () => {
    const user = await createUser('modelo-compras@example.test');
    await seedAccount(user.uid);
    const templatePayload = { title: 'Mercado mensal', listKind: 'template', cycleKey: null };
    const itemPayload = { listId: 'modelo-a', name: 'Arroz', quantityValue: 2, unit: 'pacote', unitLabel: '', detail: 'integral', sortOrder: 0 };
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingList.create', 'modelo-a', '80000000-0000-4000-8000-000000000001', 0, templatePayload)).expect(200);
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingItem.create', 'modelo-item-a', '80000000-0000-4000-8000-000000000002', 0, itemPayload)).expect(200);
    const cycle = contentCommand('shoppingList.createCycle', 'ciclo-2026-09', '80000000-0000-4000-8000-000000000003', 1, { templateId: 'modelo-a', cycleKey: '2026-09' });
    await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(cycle).expect(200);
    expect((await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(cycle)).body.result).toBe('alreadyApplied');
    const created = (await db.doc(`users/${user.uid}/shoppingLists/ciclo-2026-09`).get()).data();
    expect(created).toMatchObject({ title: 'Mercado mensal · 2026-09', listKind: 'cycle', cycleKey: '2026-09', sourceTemplateId: 'modelo-a', itemCount: 1 });
    const copied = await db.collection(`users/${user.uid}/shoppingLists/ciclo-2026-09/items`).get();
    expect(copied.docs[0]?.data()).toMatchObject({ name: 'Arroz', quantityValue: 2, unit: 'pacote', detail: 'integral', checked: false, checkedAt: null });
    expect((await db.doc(`users/${user.uid}/shoppingLists/modelo-a/items/modelo-item-a`).get()).data()?.checked).toBe(false);
    const duplicate = await request(app).post('/api/commands').set('authorization', `Bearer ${user.token}`).send(contentCommand('shoppingList.createCycle', 'ciclo-repetido', '80000000-0000-4000-8000-000000000004', 1, { templateId: 'modelo-a', cycleKey: '2026-09' }));
    expect(duplicate.status).toBe(409); expect(duplicate.body.code).toBe('CYCLE_EXISTS');
  });
});
