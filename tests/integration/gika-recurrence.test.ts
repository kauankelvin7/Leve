import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';
import type { ModelAdapter, ModelInput } from '../../server/gika/model';
import { auth, db } from '../../server/platform/firebase';
import { moveScheduleToDate, scheduleInstants } from '../../packages/domain/src/content';
import { recurrenceConfirmationSchema, recurrenceChoiceSchema, recurrenceEnvelope, type RecurrenceConfirmation } from '../../packages/domain/src/gikaRecurrence';
import { gikaInterpretationSchema } from '../../packages/domain/src/gika';
const state = vi.hoisted(() => ({ model: null as ModelAdapter | null, inputs: [] as ModelInput[] }));
vi.mock('../../server/gika/gemini.ts', () => ({ createGeminiAdapter: () => ({ classify: async () => ({intent:'AGENDA_ACTION' as const,certain:true,reply:null}), interpret: async (input: ModelInput, signal: AbortSignal) => { state.inputs.push(input); return state.model!.interpret(input, signal); } }) }));
import { app } from '../../server/app';
const zone = 'America/Sao_Paulo';
const today = () => Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
const civil = (offset: number) => Temporal.PlainDate.from(today()).add({ days: offset }).toString();
type User = { uid: string; token: string };
type Context = { user: User; seriesId: string; targetId: string; input: { requestId: string; text: string }; activity: ReturnType<typeof taskInput> };
const send = (user: User, envelope: object) => request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(envelope);
const ask = (user: User, input: { requestId: string; text: string }) => request(app).post('/api/gika/respond').set('Authorization', `Bearer ${user.token}`).send(input);
async function account(): Promise<User> {
  const user = await auth.createUser({ email: `recurrence-${crypto.randomUUID()}@example.test`, emailVerified: true, password: 'teste-seguro-123' });
  const signed = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'teste-seguro-123', returnSecureToken: true }) });
  if (!signed.ok) throw Error('Emulator sign-in failed');
  const { idToken } = await signed.json() as { idToken: string };
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, accountState: 'active', timeZone: zone, weekStartsOn: 1, revision: 1, dataVersion: 1 });
  await db.doc(`memberships/${user.uid}`).set({ state: 'active' });
  await db.doc(`users/${user.uid}/internal/counts`).set({ activities: 0, series: 0 });
  return { uid: user.uid, token: idToken };
}
function taskInput(time: string | null = '19:00') {
  return { title: 'Academia', descriptionPlain: 'Nota sintética privada preservada', categoryId: null as string | null, colorHex: '#123456', estimatedMinutes: 35,
    schedule: { type: 'task' as const, dueDate: civil(-1), dueTime: time, timeZone: zone, disambiguation: 'reject' as const }, reminderSpecs: time ? [{ id: 'reminder', minutesBefore: 15 }] : [] };
}
async function ready(operation: 'update' | 'complete' | 'reschedule' = 'update', time: string | null = '19:00'): Promise<Context> {
  const user = await account(), seriesId = crypto.randomUUID(), activity = taskInput(time);
  await send(user, { command: 'activity.createSeries', operationId: crypto.randomUUID(), entityId: seriesId, expectedRevision: 0, payload: { activity, recurrence: { frequency: 'daily', interval: 1, until: null, count: 4, monthlyPolicy: 'lastDay' } } }).expect(200);
  const target = await db.collection(`users/${user.uid}/activities`).where('seriesId', '==', seriesId).where('occurrenceKey', '==', today()).get();
  expect(target.size).toBe(1);
  const input = { requestId: crypto.randomUUID(), text: operation === 'update' ? 'Renomeia Academia para Treino' : operation === 'complete' ? 'Terminei Academia' : 'Move Academia para amanhã' };
  state.model = { interpret: async () => [{ name: operation === 'update' ? 'update_task' : operation === 'complete' ? 'complete_task' : 'reschedule_task', args: { title: 'Academia', date: null, ...(operation === 'update' ? { patch: { title: 'Treino' } } : operation === 'reschedule' ? { patch: { dueDate: civil(1) } } : {}) } }] };
  return { user, seriesId, targetId: target.docs[0]!.id, input, activity };
}
const targetRef = (context: Context) => db.doc(`users/${context.user.uid}/activities/${context.targetId}`);
const seriesRef = (context: Context) => db.doc(`users/${context.user.uid}/series/${context.seriesId}`);
const receiptRef = (context: Context) => db.doc(`commandReceipts/${context.user.uid}_${context.input.requestId}`);
async function choice(context: Context) {
  const r = await ask(context.user, context.input).expect(200);
  const parsed = gikaInterpretationSchema.parse(r.body);
  return recurrenceChoiceSchema.parse(parsed.recurrenceChoice);
}
async function choose(context: Context, scope: 'occurrence' | 'future') {
  const selected = await choice(context);
  const r = await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope }).expect(200);
  return recurrenceConfirmationSchema.parse(r.body.confirmation);
}
const envelope = (context: Context, confirmation: RecurrenceConfirmation) => recurrenceEnvelope(confirmation.effect, context.input, confirmation.token);
async function members(context: Context) {
  const snapshot = await db.collection(`users/${context.user.uid}/activities`).where('seriesId', '==', context.seriesId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })).sort((a, b) => a.id.localeCompare(b.id));
}
beforeEach(async () => {
  await fetch('http://localhost:8080/emulator/v1/projects/demo-leve/databases/(default)/documents', { method: 'DELETE' });
  const users = await auth.listUsers(); if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ mode: 'normal' });
  state.inputs = []; state.model = { interpret: async () => [] };
});

describe('M5-T3 recurrence scope through existing conventional command transactions', () => {
  it('missing scope only offers signed choices; preview/choice does not write or mint mutation receipt', async () => {
    const context = await ready(), before = await members(context), beforeSeries = (await seriesRef(context).get()).data();
    const selected = await choice(context); expect(selected.options).toEqual(['occurrence', 'future']);
    const calls = state.inputs.length;
    const preview = await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope: 'occurrence' }).expect(200);
    const timing = (token: string) => { const claims = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString()); return { issuedAt: claims.issuedAt, expiresAt: claims.expiresAt }; };
    expect(timing(recurrenceConfirmationSchema.parse(preview.body.confirmation).token)).toEqual(timing(selected.token));
    expect(state.inputs).toHaveLength(calls); expect(await members(context)).toEqual(before); expect((await seriesRef(context).get()).data()).toEqual(beforeSeries); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it.each(['update', 'complete', 'reschedule'] as const)('%s occurrence affects the exact task and preserves template/past/siblings', async operation => {
    const context = await ready(operation), before = await members(context), original = (await seriesRef(context).get()).data();
    const confirmation = await choose(context, 'occurrence'); const calls = state.inputs.length;
    const r = await send(context.user, await envelope(context, confirmation)).expect(200);
    expect(r.body).toMatchObject({ entityId: context.targetId, revision: 2, result: 'applied' });
    const after = await members(context);
    for (const item of before) if (item.id !== context.targetId) expect(after.find(next => next.id === item.id)).toEqual(item);
    const target = (await targetRef(context).get()).data()!;
    expect(target.seriesId).toBe(context.seriesId); expect(target.occurrenceKey).toBe(today()); expect(target.descriptionPlain).toBe(context.activity.descriptionPlain);
    expect(target).toMatchObject(operation === 'complete' ? { status: 'completed' } : operation === 'update' ? { title: 'Treino', status: 'pending' } : { schedule: { dueDate: civil(1), dueTime: '19:00' }, status: 'pending' });
    expect((await seriesRef(context).get()).data()).toEqual(original); expect(state.inputs).toHaveLength(calls);
    expect((await receiptRef(context).get()).data()?.gikaRecurrence.confirmation).toEqual(confirmation);
  });
  it.each(['update', 'reschedule'] as const)('%s future reuses split/new IDs, preserves past and non-requested fields/rule', async operation => {
    const context = await ready(operation), before = await members(context), original = (await seriesRef(context).get()).data()!;
    const confirmation = await choose(context, 'future'), c = await envelope(context, confirmation), calls = state.inputs.length;
    const r = await send(context.user, c).expect(200); expect(r.body).toMatchObject({ entityId: confirmation.effect.newSeriesId, revision: 1, result: 'applied' });
    const old = await members(context); expect(old).toEqual(before.filter(item => item.data.occurrenceKey < today()));
    const nextSeries = (await db.doc(`users/${context.user.uid}/series/${confirmation.effect.newSeriesId}`).get()).data()!;
    expect(nextSeries.previousSeriesId).toBe(context.seriesId); expect(nextSeries.recurrence).toEqual({ ...original.recurrence, count: 3 });
    expect(nextSeries.activity).toEqual(operation === 'update' ? { ...context.activity, title: 'Treino', schedule: { ...context.activity.schedule, dueDate: today() } } : { ...context.activity, schedule: { ...context.activity.schedule, dueDate: civil(1) } });
    const created = await db.collection(`users/${context.user.uid}/activities`).where('seriesId', '==', confirmation.effect.newSeriesId).get(); expect(created.size).toBe(3);
    for (const child of created.docs) { expect(before.some(item => item.id === child.id)).toBe(false); expect(child.data()).toMatchObject({ status: 'pending', descriptionPlain: context.activity.descriptionPlain, schedule: { dueTime: '19:00', timeZone: zone } }); }
    expect((await seriesRef(context).get()).data()).toMatchObject({ state: 'split' });
    expect((await db.doc(`users/${context.user.uid}/internal/counts`).get()).data()).toMatchObject({ activities: 4, series: 2 });
    expect(state.inputs).toHaveLength(calls);
  });
  it('date-only preserves absence of time and never introduces reminders', async () => {
    const context = await ready('reschedule', null), confirmation = await choose(context, 'future');
    await send(context.user, await envelope(context, confirmation)).expect(200);
    const next = await db.collection(`users/${context.user.uid}/activities`).where('seriesId', '==', confirmation.effect.newSeriesId).get();
    for (const document of next.docs) expect(document.data()).toMatchObject({ schedule: { dueTime: null }, reminderSpecs: [] });
  });
  it('explicit time-only occurrence change preserves civil date/template/siblings', async () => {
    const context = await ready('reschedule'), before = await members(context), original = (await seriesRef(context).get()).data();
    context.input.text = 'Mova Academia para 20h';
    state.model = { interpret: async () => [{ name: 'reschedule_task', args: { title: 'Academia', date: null, patch: { dueDate: today(), dueTime: '20:00' } } }] };
    const confirmation = await choose(context, 'occurrence'); expect(confirmation.effect.patch).toEqual({ dueDate: today(), dueTime: '20:00' });
    await send(context.user, await envelope(context, confirmation)).expect(200);
    expect((await targetRef(context).get()).data()).toMatchObject({ revision: 2, schedule: { dueDate: today(), dueTime: '20:00', timeZone: zone }, descriptionPlain: context.activity.descriptionPlain });
    expect((await seriesRef(context).get()).data()).toEqual(original);
    const after = await members(context); for (const item of before) if (item.id !== context.targetId) expect(after.find(next => next.id === item.id)).toEqual(item);
  });
  it('future completion/all scopes never become executable', async () => {
    const context = await ready('complete'), selected = await choice(context); expect(selected.options).toEqual(['occurrence']);
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope: 'future' }).expect(422);
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope: 'all' }).expect(422);
    const explicit = await ask(context.user, { requestId: crypto.randomUUID(), text: 'Terminei Academia daqui pra frente' }).expect(200); expect(explicit.body.recurrenceConfirmation).toBeUndefined(); expect(explicit.body.recurrenceChoice).toBeUndefined();
    const all = await ask(context.user, { requestId: crypto.randomUUID(), text: 'Terminei Academia toda a série' }).expect(200); expect(all.body.recurrenceConfirmation).toBeUndefined();
    expect((await targetRef(context).get()).data()?.status).toBe('pending'); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it.each(['occurrence', 'future'] as const)('%s retry/concurrency/lost ack repeats exactly one conventional effect and original receipt', async scope => {
    const context = await ready(), confirmation = await choose(context, scope), c = await envelope(context, confirmation), calls = state.inputs.length;
    const replies = await Promise.all([send(context.user, c).expect(200), send(context.user, c).expect(200)]); expect(replies.map(r => r.body.result).sort()).toEqual(['alreadyApplied', 'applied']);
    // The first committed response is deliberately discarded; all recovery is receipt-only.
    state.model = { interpret: async () => { throw Error('Provider must never run on confirmation recovery'); } };
    const recovered = await request(app).post('/api/gika/recover-confirmation').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(200); expect(recovered.body.recurrenceConfirmation).toEqual(confirmation);
    await send(context.user, c).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied'));
    const reinterpreted = await ask(context.user, context.input).expect(200); expect(reinterpreted.body.recurrenceConfirmation).toEqual(confirmation); expect(state.inputs).toHaveLength(calls);
    expect((await db.collection(`users/${context.user.uid}/activities`).get()).size).toBe(4); expect((await db.collection(`users/${context.user.uid}/series`).get()).size).toBe(scope === 'future' ? 2 : 1);
  });
  it('new intentional operation after an occurrence edit remains permitted with its own identity', async () => {
    const context = await ready(), first = await choose(context, 'occurrence'); await send(context.user, await envelope(context, first)).expect(200);
    context.input = { requestId: crypto.randomUUID(), text: 'Renomeia Treino para Treino novo' };
    state.model = { interpret: async () => [{ name: 'update_task', args: { title: 'Treino', date: null, patch: { title: 'Treino novo' } } }] };
    const next = await choose(context, 'occurrence'); await send(context.user, await envelope(context, next)).expect(200);
    expect((await targetRef(context).get()).data()).toMatchObject({ title: 'Treino novo', revision: 3 });
  });
  it.each(['target', 'sibling', 'materialization', 'series-template', 'series-deleted'])('%s changed after future preview conflicts without overwriting', async change => {
    const context = await ready(), confirmation = await choose(context, 'future'), c = await envelope(context, confirmation);
    if (change === 'target') await targetRef(context).update({ revision: 2, descriptionPlain: 'Later private target edit' });
    else if (change === 'sibling') { const sibling = (await members(context)).find(item => item.data.occurrenceKey > today())!; await db.doc(`users/${context.user.uid}/activities/${sibling.id}`).update({ revision: 2, descriptionPlain: 'Later private sibling edit' }); }
    else if (change === 'materialization') await seriesRef(context).update({ materializedCount: 5, materializedThrough: civil(3) });
    else if (change === 'series-template') await seriesRef(context).update({ 'activity.descriptionPlain': 'Later template edit' });
    else await seriesRef(context).update({ state: 'trashed' });
    const before = await members(context), r = await send(context.user, c).expect(409); expect(r.body.details?.current).toBeUndefined(); expect(await members(context)).toEqual(before); expect((await receiptRef(context).get()).exists).toBe(false); expect((await db.collection(`users/${context.user.uid}/series`).get()).size).toBe(1);
  });
  it.each([{ revision: 2 }, { status: 'completed' }, { status: 'canceled' }, { deletedAt: '2026-10-01T12:00:00.000Z' }, { descriptionPlain: 'Individual custom note' }])('unsafe future member %j excludes future scope', async changes => {
    const context = await ready(), sibling = (await members(context)).find(item => item.data.occurrenceKey > today())!;
    await db.doc(`users/${context.user.uid}/activities/${sibling.id}`).update(changes);
    const selected = await choice(context); expect(selected.options).toEqual(['occurrence']); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it('saturated future context refuses future without silent truncation', async () => {
    const context = await ready();
    await Promise.all(Array.from({ length: 51 }, (_, i) => { const date = civil(i + 3), schedule = moveScheduleToDate(context.activity.schedule, date); return db.doc(`users/${context.user.uid}/activities/sentinel-${i}`).set({ ...context.activity, schedule, ...scheduleInstants(schedule), kind: 'task', status: 'pending', completedAt: null, seriesId: context.seriesId, occurrenceKey: date, revision: 1, schemaVersion: 1, deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); }));
    await seriesRef(context).update({ materializedCount: 55, materializedThrough: civil(53) });
    const selected = await choice(context); expect(selected.options).toEqual(['occurrence']); expect(selected.proposal.recurrence).toMatchObject({ futureAllowed: false, futureHash: null });
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope: 'future' }).expect(422);
    expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it('a previously purged future member makes the split unavailable instead of changing recurrence count', async () => {
    const context = await ready(), sibling = (await members(context)).find(item => item.data.occurrenceKey > today())!;
    await db.doc(`users/${context.user.uid}/activities/${sibling.id}`).delete();
    const selected = await choice(context); expect(selected.options).toEqual(['occurrence']);
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: selected.token, scope: 'future' }).expect(422);
    expect((await receiptRef(context).get()).exists).toBe(false); expect((await seriesRef(context).get()).data()?.recurrence.count).toBe(4);
  });
  it.each(['occurrence', 'future'] as const)('%s fresh account permissions apply before mutation and receipt replay', async scope => {
    const context = await ready(), confirmation = await choose(context, scope), c = await envelope(context, confirmation);
    await db.doc(`memberships/${context.user.uid}`).update({ state: 'suspended' }); await send(context.user, c).expect(403); expect((await receiptRef(context).get()).exists).toBe(false);
    await db.doc(`memberships/${context.user.uid}`).update({ state: 'active' }); await send(context.user, c).expect(200);
    await db.doc(`users/${context.user.uid}`).update({ accountState: 'deleting' }); await send(context.user, c).expect(403);
    await request(app).post('/api/gika/recover-confirmation').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(403);
  });
  it('unauthenticated/other UID cannot select, mutate or recover a captured descriptor', async () => {
    const context = await ready(), selected = await choice(context), other = await account();
    await request(app).post('/api/gika/choose-recurrence').send({ ...context.input, token: selected.token, scope: 'occurrence' }).expect(401);
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${other.token}`).send({ ...context.input, token: selected.token, scope: 'occurrence' }).expect(422);
    const confirmed = await choose(context, 'future'), c = await envelope(context, confirmed); await send(other, c).expect(422); await request(app).post('/api/commands').send(c).expect(401);
    await send(context.user, c).expect(200); await request(app).post('/api/gika/recover-confirmation').set('Authorization', `Bearer ${other.token}`).send(context.input).expect(409);
    expect((await db.collection(`users/${other.uid}/activities`).get()).size).toBe(0);
  });
  it('logout/account suspension while waiting upstream or inspecting context blocks before authorization', async () => {
    const context = await ready(); const original = state.model!;
    state.model = { interpret: async (input, signal) => { const calls = await original.interpret(input, signal); await db.doc(`memberships/${context.user.uid}`).update({ state: 'suspended' }); return calls; } };
    await ask(context.user, context.input).expect(403); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it.each(['restricted', 'quota', 'category', 'reserved-stock'])('%s future guard blocks atomically without partial split', async scenario => {
    const context = await ready();
    if (scenario === 'category') { await db.doc(`users/${context.user.uid}/categories/category`).set({ archivedAt: null, deletedAt: null }); await seriesRef(context).update({ 'activity.categoryId': 'category' }); for (const item of await members(context)) await db.doc(`users/${context.user.uid}/activities/${item.id}`).update({ categoryId: 'category' }); }
    const confirmation = await choose(context, 'future'), c = await envelope(context, confirmation);
    if (scenario === 'restricted') await db.doc('serviceControls/global').update({ mode: 'restricted' });
    else if (scenario === 'quota') await db.doc(`usageBuckets/${context.user.uid}_${new Date().toISOString().slice(0, 16)}`).set({ count: 60 });
    else if (scenario === 'category') await db.doc(`users/${context.user.uid}/categories/category`).update({ archivedAt: new Date().toISOString() });
    else await db.doc(`users/${context.user.uid}/internal/counts`).update({ reserved_activities: 5000 });
    const before = await members(context); await send(context.user, c).expect(scenario === 'restricted' ? 503 : scenario === 'quota' ? 429 : 422); expect(await members(context)).toEqual(before); expect((await seriesRef(context).get()).data()?.state).toBe('active'); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it('tampering target/scope/new-series ID/patch/revision never changes the authorized effect', async () => {
    const context = await ready(), confirmation = await choose(context, 'future'), c = await envelope(context, confirmation), before = await members(context);
    for (const modified of [{ ...c, command: 'activity.update', payload: { title: 'Wrong scope' } }, { ...c, entityId: 'another-target' }, { ...c, expectedRevision: 2 }, { ...c, payload: { patch: { title: 'Injected' }, newSeriesId: confirmation.effect.newSeriesId } }, { ...c, payload: { patch: confirmation.effect.patch, newSeriesId: crypto.randomUUID() } }, { ...c, payload: { patch: { title: 'Treino', categoryId: 'arbitrary' }, newSeriesId: confirmation.effect.newSeriesId } }]) await send(context.user, modified).expect(422);
    expect(await members(context)).toEqual(before); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it('choice token cannot authorize a mutation, and a confirmation cannot choose a fresh scope', async () => {
    const context = await ready(), selected = await choice(context), confirmation = await choose(context, 'occurrence'), c = await envelope(context, confirmation);
    await send(context.user, { ...c, gikaRecurrence: { ...c.gikaRecurrence!, confirmationToken: selected.token } }).expect(422);
    await request(app).post('/api/gika/choose-recurrence').set('Authorization', `Bearer ${context.user.token}`).send({ ...context.input, token: confirmation.token, scope: 'future' }).expect(422); expect((await receiptRef(context).get()).exists).toBe(false);
  });
  it.each(['before', 'after'] as const)('failure %s commit conserves identity and eventual at-most-once result', async stage => {
    const context = await ready(), confirmation = await choose(context, 'future'), c = await envelope(context, confirmation);
    const original = db.runTransaction.bind(db);
    const spy = stage === 'before' ? vi.spyOn(db, 'runTransaction').mockRejectedValueOnce(Error('Synthetic precommit transport failure')) : vi.spyOn(db, 'runTransaction').mockImplementationOnce(async fn => { await original(fn); throw Error('Synthetic response lost after actual commit'); });
    try { await send(context.user, c).expect(503); } finally { spy.mockRestore(); }
    expect((await receiptRef(context).get()).exists).toBe(stage === 'after');
    await send(context.user, c).expect(200).expect(r => expect(r.body.result).toBe(stage === 'after' ? 'alreadyApplied' : 'applied'));
    expect((await db.collection(`users/${context.user.uid}/series`).get()).size).toBe(2); expect((await db.collection(`users/${context.user.uid}/activities`).get()).size).toBe(4);
  });
  it('divergent payload or original text reused after commit conflicts without second intention', async () => {
    const context = await ready(), confirmation = await choose(context, 'occurrence'), c = await envelope(context, confirmation); await send(context.user, c).expect(200);
    await send(context.user, { ...c, payload: { title: 'Another intention' } }).expect(409);
    await ask(context.user, { ...context.input, text: 'Terminei Treino' }).expect(409);
    expect((await targetRef(context).get()).data()).toMatchObject({ title: 'Treino', revision: 2 });
  });
  it('same operation identity in a different authenticated UID has isolated receipt and effect', async () => {
    const a = await ready(), first = await choose(a, 'occurrence'); await send(a.user, await envelope(a, first)).expect(200);
    const b = await ready(); b.input.requestId = a.input.requestId;
    const second = await choose(b, 'occurrence'); await send(b.user, await envelope(b, second)).expect(200);
    expect((await receiptRef(a).get()).data()?.uid).toBe(a.user.uid); expect((await receiptRef(b).get()).data()?.uid).toBe(b.user.uid);
  });
  it('no-op and repeated model function calls retain honest zero/one-effect semantics', async () => {
    const context = await ready(); state.model = { interpret: async () => [{ name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Academia' } } }] };
    const noop = await ask(context.user, { ...context.input, text: 'Renomeia Academia para Academia' }).expect(200); expect(noop.body.recurrenceChoice).toBeUndefined(); expect(noop.body.recurrenceConfirmation).toBeUndefined(); expect((await receiptRef(context).get()).exists).toBe(false);
    const call = { name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino' } } }; state.model = { interpret: async () => [call, call] };
    const confirmation = await choose(context, 'occurrence'); await send(context.user, await envelope(context, confirmation)).expect(200); expect((await targetRef(context).get()).data()?.revision).toBe(2);
  });
  it('unknown tools/fields and ambiguous/partial resolution produce no executable recurrence', async () => {
    // Independent security scenarios use distinct synthetic accounts; the production limiter remains intact.
    for (const variant of ['tool', 'field']) {
      const context = await ready(); const calls = variant === 'tool' ? [{ name: 'delete_task', args: { title: 'Academia' } }] : [{ name: 'update_task', args: { title: 'Academia', date: null, patch: { title: 'Treino' }, seriesId: context.seriesId } }];
      state.model = { interpret: async () => calls }; const r = await ask(context.user, context.input).expect(422); expect(r.body.recurrenceChoice).toBeUndefined(); expect(r.body.recurrenceConfirmation).toBeUndefined(); expect((await receiptRef(context).get()).exists).toBe(false);
    }
    const context = await ready();
    const clone = (await targetRef(context).get()).data()!; await db.doc(`users/${context.user.uid}/activities/homonym`).set(clone);
    const ambiguous = await ask(context.user, context.input).expect(200); expect(ambiguous.body.updateResolution.status).toBe('ambiguous'); expect(ambiguous.body.recurrenceChoice).toBeUndefined();
    expect((await receiptRef(context).get()).exists).toBe(false);
    const incomplete = await ready(); await db.doc(`users/${incomplete.user.uid}/series/incomplete`).set({ state: 'active' });
    const partial = await ask(incomplete.user, incomplete.input).expect(200); expect(partial.body.updateResolution.status).toBe('partial'); expect(partial.body.recurrenceChoice).toBeUndefined(); expect((await receiptRef(incomplete).get()).exists).toBe(false);
  });
});
