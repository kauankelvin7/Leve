import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';
import type { ModelAdapter, ModelInput } from '../../server/gika/model';
import { auth, db } from '../../server/platform/firebase';
const state = vi.hoisted(() => ({ model: null as ModelAdapter | null, inputs: [] as ModelInput[] }));
vi.mock('../../server/gika/gemini.ts', () => ({ createGeminiAdapter: () => ({ classify: async () => ({intent:'AGENDA_ACTION' as const,certain:true,reply:null}), interpret: async (input: ModelInput, signal: AbortSignal) => {
  state.inputs.push(input); return state.model!.interpret(input, signal);
} }) }));
import * as policy from '../../server/gika/actionPolicy';
import { app } from '../../server/app';
import { gikaInterpretationSchema } from '../../packages/domain/src/gika';
const id = '3dad14e9-a25a-48a3-a5ab-d05d277c3991';
const zone = 'America/Sao_Paulo';
async function account(verified = true, membership = 'active', timeZone = zone) {
  const user = await auth.createUser({ email: `gika-${crypto.randomUUID()}@example.test`, emailVerified: verified, password: 'teste-seguro-123' });
  const signed = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'teste-seguro-123', returnSecureToken: true }) });
  if (!signed.ok) throw new Error('Emulator sign-in failed');
  const { idToken } = await signed.json() as { idToken: string };
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, accountState: 'active', timeZone, weekStartsOn: 1, revision: 1, dataVersion: 1 });
  await db.doc(`memberships/${user.uid}`).set({ state: membership });
  return { uid: user.uid, token: idToken };
}
async function seedTask(uid: string, entity: string, date: string, title = 'Leitura', extra: Record<string, unknown> = {}) {
  const data = { title, descriptionPlain: 'PRIVATE_DESCRIPTION', categoryId: null, schedule: { type: 'task', dueDate: date, dueTime: null, timeZone: zone, disambiguation: 'reject' }, reminderSpecs: [], kind: 'task', status: 'pending', revision: 1, schemaVersion: 1, deletedAt: null, seriesId: null, occurrenceKey: null, ...extra };
  await db.doc(`users/${uid}/activities/${entity}`).set(data);
  return data;
}
function ask(token: string, body: Record<string, unknown> = { requestId: id, text: 'O que tenho hoje?' }) { return request(app).post('/api/gika/respond').set('Authorization', `Bearer ${token}`).send(body); }
beforeEach(async () => {
  await fetch('http://localhost:8080/emulator/v1/projects/demo-leve/databases/(default)/documents', { method: 'DELETE' });
  const users = await auth.listUsers(); if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ mode: 'normal' });
  state.inputs = []; state.model = { interpret: async () => [{ name: 'get_today', args: {} }] };
});

describe('M5-T1 policy complements commands and authorization', () => {
  const today = () => Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
  const tomorrow = () => Temporal.PlainDate.from(today()).add({ days: 1 }).toString();
  const completion = () => [{ name: 'complete_task', args: { title: 'Academia', date: null } }];
  async function ready(extra: Record<string, unknown> = {}) {
    const user = await account(); await seedTask(user.uid, 'target', today(), 'Academia', extra);
    state.model = { interpret: async () => completion() }; return user;
  }
  const askCompletion = (user: {token:string}, requestId = id) => ask(user.token, { requestId, text: 'Terminei Academia' });
  it('simple create classification emits descriptor, missing original title only clarifies', async () => {
    const user = await account();
    state.model = { interpret: async () => [{ name: 'create_task', args: { title: 'Academia', dueDate: tomorrow(), dueTime: null } }] };
    const valid = await ask(user.token, { requestId: id, text: 'Adiciona Academia amanhã' }).expect(200);
    expect(valid.body).toHaveProperty('createTask');
    const missing = await ask(user.token, { requestId: crypto.randomUUID(), text: 'Cria uma tarefa' }).expect(200);
    expect(missing.body).not.toHaveProperty('createTask'); expect(missing.body.text).toContain('Qual tarefa');
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
  it.each(['ambiguous', 'not_found', 'partial', 'recurring', 'already_completed'])('%s resolution exposes no executable descriptor or writes', async scenario => {
    const user = await ready(scenario === 'recurring' ? { seriesId: 'series' } : scenario === 'already_completed' ? { status: 'completed' } : {});
    if (scenario === 'ambiguous') await seedTask(user.uid, 'other', today(), 'Academia');
    if (scenario === 'not_found') await db.doc(`users/${user.uid}/activities/target`).update({ title: 'Outra' });
    if (scenario === 'partial') await db.doc(`users/${user.uid}/series/missing`).set({ state: 'active' });
    const before = await db.collection(`users/${user.uid}/activities`).get();
    const r = await askCompletion(user).expect(200); expect(r.body).not.toHaveProperty('completeTask');
    const after = await db.collection(`users/${user.uid}/activities`).get(); expect(after.docs.map(d => d.data())).toEqual(before.docs.map(d => d.data()));
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
  it('single complete stays valid but policy allow cannot override original command revision', async () => {
    const user = await ready(); const r = await askCompletion(user).expect(200);
    const { completionEnvelope } = await import('../../packages/domain/src/gikaCompletion');
    const c = await completionEnvelope(gikaInterpretationSchema.parse(r.body).completeTask!, { requestId: id, text: 'Terminei Academia' });
    await db.doc(`users/${user.uid}/activities/target`).update({ revision: 2, descriptionPlain: 'Later synthetic edit' });
    await request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(c).expect(409);
    expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()).toMatchObject({ status: 'pending', revision: 2 });
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
  it('valid rename and reschedule maintain descriptors and preview without mutation', async () => {
    const user = await ready();
    state.model = { interpret: async () => [{ name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino' } } }] };
    const rename = await ask(user.token, { requestId: id, text: 'Renomeia Academia para Treino' }).expect(200);
    expect(rename.body).toHaveProperty('updateTask');
    state.model = { interpret: async () => [{ name: 'reschedule_task', args: { title: 'Academia', date: null, patch: { dueDate: tomorrow() } } }] };
    const move = await ask(user.token, { requestId: crypto.randomUUID(), text: 'Move Academia para amanhã' }).expect(200);
    expect(move.body).toHaveProperty('rescheduleTask');
    expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()).toMatchObject({ title: 'Academia', revision: 1, schedule: { dueDate: today() } });
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
  it('model/client policy flags, extra fields, unknown/destructive/bulk tools cannot enable commands', async () => {
    const variants = [
      [{ name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino', dueDate: tomorrow() } } }],
      [{ name: 'delete_task', args: { title: 'Academia', safe: true } }],
      [{ ...completion()[0]!, args: { ...completion()[0]!.args, confirmed: true, policy: { kind: 'allow' } } }],
      [completion()[0]!, { name: 'complete_task', args: { title: 'Outra', date: null } }],
    ];
    for (const calls of variants) {
      const user = await ready(); state.model = { interpret: async () => calls };
      await askCompletion(user).expect(422);
      await ask(user.token, { requestId: id, text: 'Terminei Academia', policy: { kind: 'allow' } }).expect(422);
      expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()?.revision).toBe(1);
    }
    expect((await db.collection('commandReceipts').get()).size).toBe(0);
  });
  it('missing auth and revocation during upstream never reach mutation despite valid call', async () => {
    await request(app).post('/api/gika/respond').send({ requestId: id, text: 'Terminei Academia' }).expect(401);
    const user = await ready(); state.model = { interpret: async () => { await db.doc(`memberships/${user.uid}`).update({ state: 'suspended' }); return completion(); } };
    await askCompletion(user).expect(403); expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()?.revision).toBe(1);
  });
  it('another UID cannot execute descriptor, and receipt replay bypasses current-state reinterpretation only', async () => {
    const user = await ready(), other = await account(); const r = await askCompletion(user).expect(200);
    const { completionEnvelope } = await import('../../packages/domain/src/gikaCompletion');
    const c = await completionEnvelope(gikaInterpretationSchema.parse(r.body).completeTask!, { requestId: id, text: 'Terminei Academia' });
    await request(app).post('/api/commands').set('Authorization', `Bearer ${other.token}`).send(c).expect(409);
    await request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(c).expect(200);
    state.model = { interpret: async () => { throw Error('Receipt must precede provider'); } };
    const replay = await askCompletion(user).expect(200); expect(replay.body.completeTask).toEqual(r.body.completeTask);
    await request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(c).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied'));
    expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()?.revision).toBe(2);
    expect((await db.collection(`users/${other.uid}/activities`).get()).size).toBe(0);
  });
});

it.each(['create_task', 'complete_task', 'update_task', 'reschedule_task'] as const)('M5-T1 denied policy blocks %s descriptor even with otherwise valid schema/resolution', async action => {
  const user = await account(), date = Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString(), next = Temporal.PlainDate.from(date).add({ days: 1 }).toString();
  await seedTask(user.uid, 'target', date, 'Academia');
  const cases = {
    create_task: { text: 'Adiciona Academia amanhã', args: { title: 'Academia', dueDate: next, dueTime: null } },
    complete_task: { text: 'Terminei Academia', args: { title: 'Academia', date: null } },
    update_task: { text: 'Renomeia Academia para Treino', args: { title: 'Academia', date: null, patch: { title: 'Treino' } } },
    reschedule_task: { text: 'Move Academia para amanhã', args: { title: 'Academia', date: null, patch: { dueDate: next } } },
  };
  state.model = { interpret: async () => [{ name: action, args: cases[action].args }] };
  const spy = vi.spyOn(policy, 'classifyGikaAction').mockReturnValueOnce({ kind: 'deny', reason: 'INVALID_FACTS' });
  try { await ask(user.token, { requestId: id, text: cases[action].text }).expect(422); expect(spy).toHaveBeenCalledOnce(); }
  finally { spy.mockRestore(); }
  expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()?.revision).toBe(1);
  expect((await db.collection('commandReceipts').get()).size).toBe(0);
});

it('M5-T1 receipt committed during saturated read precedes a denied new resolution', async () => {
  const user = await account(), date = Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
  await seedTask(user.uid, 'target', date, 'Academia');
  state.model = { interpret: async () => [{ name: 'complete_task', args: { title: 'Academia', date: null } }] };
  const question = { requestId: id, text: 'Terminei Academia' };
  const first = await ask(user.token, question).expect(200);
  const { completionEnvelope } = await import('../../packages/domain/src/gikaCompletion');
  const c = await completionEnvelope(gikaInterpretationSchema.parse(first.body).completeTask!, question);
  const { firestoreReads } = await import('../../server/gika/reads');
  const original = firestoreReads.read.bind(firestoreReads);
  const spy = vi.spyOn(firestoreReads, 'read').mockImplementationOnce(async (...args) => {
    const read = await original(...args);
    await request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(c).expect(200);
    return { ...read, partial: false, items: [read.items[0]!, ...Array.from({ length: 49 }, (_, i) => ({ ...read.items[0]!, id: 'other-' + i, title: 'Outro ' + i }))] };
  });
  try {
    const raced = await ask(user.token, question).expect(200); expect(raced.body.completeTask).toEqual(first.body.completeTask);
    await request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(c).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied'));
  } finally { spy.mockRestore(); }
  expect((await db.doc(`users/${user.uid}/activities/target`).get()).data()?.revision).toBe(2);
  expect((await db.collection('commandReceipts').get()).size).toBe(1);
});
