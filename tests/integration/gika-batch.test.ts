import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';
import type { ModelAdapter } from '../../server/gika/model';
const modelState = vi.hoisted(() => ({ model: null as ModelAdapter | null, calls: 0 }));
vi.mock('../../server/gika/gemini.ts', () => ({ createGeminiAdapter: () => ({ interpret: async (...args: Parameters<ModelAdapter['interpret']>) => { modelState.calls++; return modelState.model!.interpret(...args); } }) }));
import { auth, db } from '../../server/platform/firebase';
import { app } from '../../server/app';
import { batchEnvelope, batchOperationId, batchPlanSchema, type BatchPlan } from '../../packages/domain/src/gikaBatch';
import { firestoreReads } from '../../server/gika/reads';
import { issueBatchConfirmation } from '../../server/gika/confirmation';
const zone = 'America/Sao_Paulo';
const today = () => Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
const tomorrow = () => Temporal.PlainDate.from(today()).add({ days: 1 }).toString();
type User = { uid: string; token: string };
const send = (user: User, command: object) => request(app).post('/api/commands').set('Authorization', `Bearer ${user.token}`).send(command);
async function account(): Promise<User> {
  const user = await auth.createUser({ email: `batch-${crypto.randomUUID()}@example.test`, emailVerified: true, password: 'teste-seguro-123' });
  const signed = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'teste-seguro-123', returnSecureToken: true }) });
  if (!signed.ok) throw Error('Emulator sign-in failed');
  const { idToken } = await signed.json() as { idToken: string };
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, accountState: 'active', timeZone: zone, weekStartsOn: 1, revision: 1, dataVersion: 1 });
  await db.doc(`memberships/${user.uid}`).set({ state: 'active' });
  await db.doc(`users/${user.uid}/internal/counts`).set({ activities: 0, series: 0 });
  return { uid: user.uid, token: idToken };
}
async function ready(action: 'complete' | 'reschedule' = 'complete', time: string | null = '19:00') {
  const user = await account(), input = { requestId: crypto.randomUUID(), text: action === 'complete' ? 'Conclui as tarefas de hoje' : 'Move as tarefas de hoje para amanhã' };
  const ids = [crypto.randomUUID(), crypto.randomUUID()].sort();
  for (const [index, id] of ids.entries()) await send(user, { command: 'activity.create', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: { title: `Teste ${index}`, descriptionPlain: 'Nota sintética preservada', categoryId: null, colorHex: '#123456', estimatedMinutes: 35, schedule: { type: 'task', dueDate: today(), dueTime: time, timeZone: zone, disambiguation: 'reject' }, reminderSpecs: [] } }).expect(200);
  const plan: BatchPlan = batchPlanSchema.parse({ action, sourceDate: today(), items: await Promise.all(ids.map(async (id, index) => ({ id, operationId: await batchOperationId(user.uid, input.requestId, index), title: `Teste ${index}`, revision: 1, timeZone: zone, before: { dueDate: today(), dueTime: time }, scope: 'none', patch: action === 'complete' ? { status: 'completed' } : { dueDate: tomorrow() } }))) });
  const confirmation = issueBatchConfirmation(user.uid, input, plan);
  const commands = await Promise.all(plan.items.map((_, index) => batchEnvelope(confirmation, input, index)));
  return { user, input, plan, confirmation, commands, ids };
}
type Context = Awaited<ReturnType<typeof ready>>;
const task = (context: Context, index: number) => db.doc(`users/${context.user.uid}/activities/${context.ids[index]}`);
const receipt = (context: Context, index: number) => db.doc(`commandReceipts/${context.user.uid}_${context.commands[index]!.operationId}`);
async function snapshot(context: Context) { return Promise.all(context.ids.map(async (_, index) => (await task(context, index).get()).data())); }
beforeEach(async () => {
  await fetch('http://localhost:8080/emulator/v1/projects/demo-leve/databases/(default)/documents', { method: 'DELETE' });
  const users = await auth.listUsers(); if (users.users.length) await auth.deleteUsers(users.users.map(user => user.uid));
  await db.doc('serviceControls/global').set({ mode: 'normal' });
  modelState.calls = 0; modelState.model = { interpret: async () => [] };
});
describe('M5-T4 sealed itemized batch through existing conventional command writer', () => {
  it.each(['oversized', 'empty', 'noop', 'future', 'unknown-tool', 'unknown-field', 'date-drift', 'account-change'] as const)('%s produces no executable preview or domain writes', async scenario => {
    const context = await ready(), before = await snapshot(context);
    let call = { name: 'batch_complete', args: { sourceDate: today(), title: null as string | null, excludeTitles: [] as string[], scope: null as 'future' | null } };
    if (scenario === 'oversized') {
      const clone = (await task(context, 0).get()).data()!;
      for (let index = 0; index < 4; index++) await db.doc(`users/${context.user.uid}/activities/overflow-${index}`).set({ ...clone, title: `Extra ${index}` });
    } else if (scenario === 'empty') { call.args.title = 'Inexistente'; context.input.text = 'Conclui as tarefas chamadas "Inexistente" de hoje'; }
    else if (scenario === 'future') { call.args.scope = 'future'; context.input.text += ' daqui pra frente'; }
    else if (scenario === 'date-drift') call.args.sourceDate = tomorrow();
    else if (scenario === 'unknown-tool') call.name = 'batch_delete';
    if (scenario === 'noop') {
      context.input.text = 'Move as tarefas de hoje para hoje';
      modelState.model = { interpret: async () => [{ name: 'batch_reschedule', args: { ...call.args, dueDate: today(), dueTime: null } }] };
    } else modelState.model = { interpret: async () => {
      if (scenario === 'account-change') await db.doc(`memberships/${context.user.uid}`).update({ state: 'suspended' });
      return [{ ...call, args: { ...call.args, ...(scenario === 'unknown-field' ? { uid: 'arbitrary' } : {}) } }];
    } };
    const response = await request(app).post('/api/gika/respond').set('Authorization', `Bearer ${context.user.token}`).send(context.input);
    expect(response.status).toBe(scenario === 'account-change' ? 403 : ['unknown-tool', 'unknown-field', 'date-drift'].includes(scenario) ? 422 : 200);
    expect(response.body.batchConfirmation).toBeUndefined(); expect(await snapshot(context)).toEqual(before);
    for (let index = 0; index < 2; index++) expect((await receipt(context, index).get()).exists).toBe(false);
  });
  it.each(['complete', 'reschedule'] as const)('%s model produces sealed preview only; receipt recovery never calls provider', async action => {
    const context = await ready(action);
    const call = { name: action === 'complete' ? 'batch_complete' : 'batch_reschedule', args: { sourceDate: today(), title: null, excludeTitles: [], scope: null, ...(action === 'reschedule' ? { dueDate: tomorrow(), dueTime: null } : {}) } };
    modelState.model = { interpret: async () => [call, call] };
    const before = await snapshot(context);
    const response = await request(app).post('/api/gika/respond').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(200);
    expect(response.body.batchConfirmation?.plan.items).toHaveLength(2); expect(await snapshot(context)).toEqual(before);
    for (let index = 0; index < 2; index++) await send(context.user, await batchEnvelope(response.body.batchConfirmation, context.input, index)).expect(200);
    const calls = modelState.calls; modelState.model = { interpret: async () => { throw Error('Recovery must not call provider'); } };
    const recovered = await request(app).post('/api/gika/recover-batch').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(200);
    expect(recovered.body.confirmation).toEqual(response.body.batchConfirmation); expect(recovered.body.result).toMatchObject({ alreadyApplied: 2, pending: 0 });
    await request(app).post('/api/gika/respond').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(200); expect(modelState.calls).toBe(calls);
    await request(app).post('/api/gika/recover-batch').send(context.input).expect(401);
    const other = await account(); await request(app).post('/api/gika/recover-batch').set('Authorization', `Bearer ${other.token}`).send(context.input).expect(409);
    await db.doc(`memberships/${context.user.uid}`).update({ state: 'suspended' });
    await request(app).post('/api/gika/recover-batch').set('Authorization', `Bearer ${context.user.token}`).send(context.input).expect(403);
  });
  it.each(['complete', 'reschedule'] as const)('%s preview writes nothing; acknowledged items execute exactly minimal effects', async action => {
    const context = await ready(action), before = await snapshot(context);
    expect(await snapshot(context)).toEqual(before);
    for (let index = 0; index < 2; index++) {
      expect((await receipt(context, index).get()).exists).toBe(false);
      const response = await send(context.user, context.commands[index]!).expect(200);
      expect(response.body).toMatchObject({ entityId: context.ids[index], revision: 2, result: 'applied' });
      const after = (await task(context, index).get()).data()!;
      expect(after).toMatchObject({ title: before[index]!.title, descriptionPlain: before[index]!.descriptionPlain, colorHex: before[index]!.colorHex, estimatedMinutes: 35, schedule: { dueTime: '19:00', dueDate: action === 'complete' ? today() : tomorrow() }, status: action === 'complete' ? 'completed' : 'pending' });
    }
  });
  it('explicit occurrence batch preserves series templates and every non-target occurrence', async () => {
    const context = await ready();
    const seriesId = crypto.randomUUID();
    const activity = { title: 'Rotina teste', descriptionPlain: 'Nota sintética preservada', categoryId: null, colorHex: '#123456', estimatedMinutes: 35, schedule: { type: 'task', dueDate: today(), dueTime: '19:00', timeZone: zone, disambiguation: 'reject' }, reminderSpecs: [] };
    await send(context.user, { command: 'activity.createSeries', operationId: crypto.randomUUID(), entityId: seriesId, expectedRevision: 0, payload: { activity, recurrence: { frequency: 'daily', interval: 1, until: null, count: 3, monthlyPolicy: 'lastDay' } } }).expect(200);
    const members = await db.collection(`users/${context.user.uid}/activities`).where('seriesId', '==', seriesId).get();
    const target = members.docs.find(doc => doc.data().occurrenceKey === today())!;
    const beforeSeries = (await db.doc(`users/${context.user.uid}/series/${seriesId}`).get()).data();
    const descriptor = { id: target.id, title: activity.title, revision: 1, dueDate: today(), dueTime: '19:00', timeZone: zone };
    const recurrence = await firestoreReads.inspectRecurrence!(context.user.uid, descriptor); expect(recurrence).not.toBeNull();
    const input = { requestId: crypto.randomUUID(), text: 'Conclui as tarefas de hoje só estas ocorrências' };
    const plan = batchPlanSchema.parse({ action: 'complete', sourceDate: today(), items: [{ operationId: await batchOperationId(context.user.uid, input.requestId, 0), id: target.id, title: activity.title, revision: 1, timeZone: zone, before: { dueDate: today(), dueTime: '19:00' }, patch: { status: 'completed' }, scope: 'occurrence', recurrence }] });
    const confirmation = issueBatchConfirmation(context.user.uid, input, plan);
    await send(context.user, await batchEnvelope(confirmation, input, 0)).expect(200);
    expect((await target.ref.get()).data()).toMatchObject({ status: 'completed', revision: 2, seriesId });
    expect((await db.doc(`users/${context.user.uid}/series/${seriesId}`).get()).data()).toEqual(beforeSeries);
    for (const sibling of members.docs) if (sibling.id !== target.id) expect((await sibling.ref.get()).data()).toEqual(sibling.data());
  });
  it('receipt-only recovery returns immutable original plan and exact partial statuses', async () => {
    const context = await ready(); await send(context.user, context.commands[0]!).expect(200);
    const recovered = await firestoreReads.recoverBatch!(context.user.uid, context.input);
    expect(recovered?.confirmation).toEqual(context.confirmation); expect(recovered?.result).toMatchObject({ requested: 2, alreadyApplied: 1, pending: 1 });
    await expect(firestoreReads.recoverBatch!(context.user.uid, { ...context.input, text: 'Another intention' })).rejects.toThrow();
    const other = await account(); expect(await firestoreReads.recoverBatch!(other.uid, context.input)).toBeNull();
    await send(context.user, context.commands[1]!).expect(200); expect((await firestoreReads.recoverBatch!(context.user.uid, context.input))?.result).toMatchObject({ alreadyApplied: 2, pending: 0 });
  });
  it('cannot execute later child before its predecessor receipt exists', async () => { const context = await ready(); const before = await snapshot(context); await send(context.user, context.commands[1]!).expect(409); expect(await snapshot(context)).toEqual(before); });
  it('date-only preserves absence of time', async () => { const context = await ready('reschedule', null); await send(context.user, context.commands[0]!).expect(200); expect((await task(context, 0).get()).data()?.schedule).toMatchObject({ dueDate: tomorrow(), dueTime: null }); });
  it.each([0, 1])('initial conflict in item %s prevents first commit and all receipts', async index => {
    const context = await ready(); await task(context, index).update({ revision: 2, descriptionPlain: 'Later independent edit' }); const before = await snapshot(context);
    await send(context.user, context.commands[0]!).expect(409); expect(await snapshot(context)).toEqual(before);
    for (let i = 0; i < 2; i++) expect((await receipt(context, i).get()).exists).toBe(false);
  });
  it('later conflict preserves earlier ack without claiming whole-batch atomicity or overwriting newer work', async () => {
    const context = await ready(); await send(context.user, context.commands[0]!).expect(200);
    await task(context, 1).update({ revision: 2, descriptionPlain: 'Later independent edit' });
    await send(context.user, context.commands[1]!).expect(409);
    expect((await task(context, 0).get()).data()).toMatchObject({ status: 'completed', revision: 2 });
    expect((await task(context, 1).get()).data()).toMatchObject({ status: 'pending', revision: 2, descriptionPlain: 'Later independent edit' });
    expect((await receipt(context, 0).get()).exists).toBe(true); expect((await receipt(context, 1).get()).exists).toBe(false);
    await send(context.user, context.commands[0]!).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied'));
  });
  it('sequential and simultaneous retries/lost ack never repeat item effects', async () => {
    const context = await ready(); const responses = await Promise.all([send(context.user, context.commands[0]!).expect(200), send(context.user, context.commands[0]!).expect(200)]);
    expect(responses.map(r => r.body.result).sort()).toEqual(['alreadyApplied', 'applied']);
    // Discard the committed response and retry the identical envelope.
    await send(context.user, context.commands[0]!).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied'));
    await send(context.user, context.commands[1]!).expect(200);
    expect((await snapshot(context)).map(data => data!.revision)).toEqual([2, 2]);
  });
  it('concurrent different child commands revalidate pending siblings and produce at most one effect per item', async () => {
    const context = await ready(); const replies = await Promise.all(context.commands.map(command => send(context.user, command)));
    expect(replies[0]!.status).toBe(200); expect([200, 409]).toContain(replies[1]!.status);
    await send(context.user, context.commands[1]!).expect(200);
    expect((await snapshot(context)).map(data => data!.revision)).toEqual([2, 2]);
  });
  it('tampered target/revision/index/operation/patch cannot bypass the sealed plan', async () => {
    const context = await ready(), command = context.commands[0]!, before = await snapshot(context);
    for (const changed of [{ ...command, entityId: context.ids[1] }, { ...command, expectedRevision: 2 }, { ...command, operationId: crypto.randomUUID() }, { ...command, payload: { status: 'canceled' } }, { ...command, payload: { status: 'completed', title: 'Injected' } }, { ...command, gikaBatch: { ...command.gikaBatch!, index: 1 } }]) await send(context.user, changed).expect(422);
    expect(await snapshot(context)).toEqual(before); expect((await receipt(context, 0).get()).exists).toBe(false);
  });
  it('index outside the sealed cardinality is invalid before any item can commit', async () => {
    const context = await ready('reschedule'), before = await snapshot(context), command = context.commands[0]!;
    await send(context.user, { ...command, gikaBatch: { ...command.gikaBatch!, index: 4 } }).expect(422);
    expect(await snapshot(context)).toEqual(before);
    for (let index = 0; index < 2; index++) expect((await receipt(context, index).get()).exists).toBe(false);
  });
  it('divergent payload after receipt conflicts rather than executing another intention', async () => { const context = await ready('reschedule'); await send(context.user, context.commands[0]!).expect(200); await send(context.user, { ...context.commands[0]!, payload: { dueDate: Temporal.PlainDate.from(today()).add({ days: 2 }).toString() } }).expect(409); expect((await task(context, 0).get()).data()?.revision).toBe(2); });
  it('unauthenticated/other UID cannot mutate or reuse a captured receipt', async () => {
    const context = await ready(), other = await account(); await request(app).post('/api/commands').send(context.commands[0]).expect(401);
    await send(other, context.commands[0]!).expect(422); await send(context.user, context.commands[0]!).expect(200); await send(other, context.commands[0]!).expect(422);
    expect((await db.collection(`users/${other.uid}/activities`).get()).size).toBe(0); expect((await db.doc(`commandReceipts/${other.uid}_${context.commands[0]!.operationId}`).get()).exists).toBe(false);
  });
  it('account suspension after first ack blocks pending writes and historical replay', async () => { const context = await ready(); await send(context.user, context.commands[0]!).expect(200); await db.doc(`memberships/${context.user.uid}`).update({ state: 'suspended' }); for (const command of context.commands) await send(context.user, command).expect(403); expect((await task(context, 1).get()).data()?.status).toBe('pending'); });
  it.each(['restricted', 'quota'] as const)('%s blocks before first commit', async kind => {
    const context = await ready(), before = await snapshot(context);
    if (kind === 'restricted') await db.doc('serviceControls/global').update({ mode: 'restricted' }); else await db.doc(`usageBuckets/${context.user.uid}_${new Date().toISOString().slice(0, 16)}`).set({ count: 60 });
    await send(context.user, context.commands[0]!).expect(kind === 'restricted' ? 503 : 429); expect(await snapshot(context)).toEqual(before); expect((await receipt(context, 0).get()).exists).toBe(false);
  });
  it.each(['before', 'after'] as const)('failure %s commit permits honest exact replay without duplicate', async stage => {
    const context = await ready(), original = db.runTransaction.bind(db);
    const spy = stage === 'before' ? vi.spyOn(db, 'runTransaction').mockRejectedValueOnce(Error('Synthetic precommit failure')) : vi.spyOn(db, 'runTransaction').mockImplementationOnce(async fn => { await original(fn); throw Error('Synthetic lost ack'); });
    try { await send(context.user, context.commands[0]!).expect(503); } finally { spy.mockRestore(); }
    expect((await receipt(context, 0).get()).exists).toBe(stage === 'after');
    await send(context.user, context.commands[0]!).expect(200).expect(r => expect(r.body.result).toBe(stage === 'after' ? 'alreadyApplied' : 'applied'));
    await send(context.user, context.commands[1]!).expect(200); expect((await snapshot(context)).map(data => data!.revision)).toEqual([2, 2]);
  });
  it('expired batch permits historical receipt replay but cannot authorize pending siblings', async () => {
    const context = await ready(); await send(context.user, context.commands[0]!).expect(200);
    const now = Date.now(), clock = vi.spyOn(Date, 'now').mockReturnValue(now + 16 * 60_000);
    try { await send(context.user, context.commands[0]!).expect(200).expect(r => expect(r.body.result).toBe('alreadyApplied')); await send(context.user, context.commands[1]!).expect(409); } finally { clock.mockRestore(); }
    expect((await task(context, 1).get()).data()?.status).toBe('pending'); expect((await receipt(context, 1).get()).exists).toBe(false);
  });
});

describe('M6-T2 daily proposal composes the proven command/confirmation/receipt path',()=>{
  async function proposal(keepFirst=false){
    const context=await ready('reschedule');context.input.text='Organiza meu dia';
    modelState.model={interpret:async input=>{
      expect(input.planning?.tasks).toHaveLength(2);
      expect(JSON.stringify(input.planning)).not.toContain(context.ids[0]!);
      expect(JSON.stringify(input.planning)).not.toContain('Nota sintética');
      return [{name:'propose_organization',args:{items:input.planning!.tasks.map(item=>({ref:item.ref,action:keepFirst&&item.ref===0?'keep':'move',dueDate:keepFirst&&item.ref===0?today():tomorrow(),dueTime:item.dueTime}))}}];
    }};
    const response=await request(app).post('/api/gika/respond').set('Authorization',`Bearer ${context.user.token}`).send(context.input).expect(200);
    expect(response.body.batchConfirmation).toBeTruthy();
    return {...context,confirmation:response.body.batchConfirmation};
  }
  it('preview writes nothing, heterogeneous suggestions confirm exact effects and receipt replay needs no model',async()=>{
    const context=await proposal(true),original=await snapshot(context);
    expect(modelState.calls).toBe(1);expect(context.confirmation.plan.items).toHaveLength(1);
    const envelope=await batchEnvelope(context.confirmation,context.input,0);
    expect((await db.doc(`commandReceipts/${context.user.uid}_${envelope.operationId}`).get()).exists).toBe(false);
    expect(await snapshot(context)).toEqual(original);
    await send(context.user,envelope).expect(200);
    await send(context.user,envelope).expect(200).expect(response=>expect(response.body.result).toBe('alreadyApplied'));
    const after=await snapshot(context);expect(after[0]).toEqual(original[0]);
    expect(after[1]).toMatchObject({revision:2,schedule:{dueDate:tomorrow(),dueTime:'19:00'},descriptionPlain:'Nota sintética preservada',colorHex:'#123456',estimatedMinutes:35});
    const recovered=await request(app).post('/api/gika/respond').set('Authorization',`Bearer ${context.user.token}`).send(context.input).expect(200);
    expect(recovered.body.batchConfirmation).toEqual(context.confirmation);expect(modelState.calls).toBe(1);
  });
  it('a preserved task edited after preview blocks the first mutation without refreshing revisions',async()=>{
    const context=await proposal(true),original=await snapshot(context);
    // Controlled concurrent fixture edit verifies the preserved precondition.
    await task(context,0).update({revision:2,title:'Edição posterior'});
    await send(context.user,await batchEnvelope(context.confirmation,context.input,0)).expect(409);
    expect((await task(context,1).get()).data()).toEqual(original[1]);
  });
  it('lost acknowledgement and concurrent confirmations each apply one logical effect per target',async()=>{
    const context=await proposal(),envelopes=await Promise.all(context.confirmation.plan.items.map((_:unknown,index:number)=>batchEnvelope(context.confirmation,context.input,index)));
    for(const envelope of envelopes){
      const responses=await Promise.all([send(context.user,envelope),send(context.user,envelope)]);
      expect(responses.map(response=>response.status)).toEqual([200,200]);
      expect(responses.map(response=>response.body.result).sort()).toEqual(['alreadyApplied','applied']);
    }
    const recovered=await request(app).post('/api/gika/recover-batch').set('Authorization',`Bearer ${context.user.token}`).send(context.input).expect(200);
    expect(recovered.body.result).toMatchObject({alreadyApplied:2,applied:0,pending:0});expect(modelState.calls).toBe(1);
    for(const document of await snapshot(context))expect(document?.revision).toBe(2);
  });
  it.each(['invented','stale','revoked','partial'] as const)('%s cannot seal or apply a proposal',async variant=>{
    const context=await ready('reschedule'),original=await snapshot(context);context.input.text='Organiza meu dia';
    const spy=variant==='partial'?vi.spyOn(firestoreReads,'read').mockImplementation(async()=>({startDate:today(),endDate:today(),timeZone:zone,partial:true,cached:false,items:[]})):undefined;
    modelState.model={interpret:async input=>{
      if(variant==='stale')await task(context,0).update({revision:2});
      if(variant==='revoked')await db.doc(`memberships/${context.user.uid}`).update({state:'suspended'});
      return [{name:'propose_organization',args:{items:input.planning!.tasks.map(item=>({ref:variant==='invented'?4:item.ref,action:'move',dueDate:tomorrow(),dueTime:item.dueTime}))}}];
    }};
    try{
      const response=await request(app).post('/api/gika/respond').set('Authorization',`Bearer ${context.user.token}`).send(context.input);
      expect(response.status).toBe(variant==='partial'?200:variant==='revoked'?403:422);expect(response.body.batchConfirmation).toBeUndefined();
      for(const [index,document]of (await snapshot(context)).entries())expect(document).toEqual({...original[index],...(variant==='stale'&&index===0?{revision:2}:{})});
      if(variant==='partial')expect(modelState.calls).toBe(0);
    }finally{spy?.mockRestore();}
  });
});
