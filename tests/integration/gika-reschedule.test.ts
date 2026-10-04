import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Temporal } from '@js-temporal/polyfill';
import type { ModelAdapter, ModelInput } from '../../server/gika/model';
import { auth, db } from '../../server/platform/firebase';
const state = vi.hoisted(() => ({ model: null as ModelAdapter | null, inputs: [] as ModelInput[] }));
vi.mock('../../server/gika/gemini.ts', () => ({ createGeminiAdapter: () => ({ interpret: async (input: ModelInput, signal: AbortSignal) => {
  state.inputs.push(input); return state.model!.interpret(input, signal);
} }) }));
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

describe('M4-T3 temporal patch through conventional transaction/receipt',()=>{
 const target='reschedule-target',text='Move Academia para amanhã';
 const today=()=>Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
 const tomorrow=()=>Temporal.PlainDate.from(today()).add({days:1}).toString();
 const call=()=>({name:'reschedule_task',args:{title:'academia',date:null,patch:{dueDate:tomorrow()}}});
 async function ready(extra:Record<string,unknown>={}){const user=await account();await seedTask(user.uid,target,today(),'Academia',extra);state.model={interpret:async()=>[call()]};return user;}
 const interpret=(u:{token:string},requestId=id,question=text)=>ask(u.token,{requestId,text:question}).expect(200);
 async function envelope(body:unknown,requestId=id,question=text){const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');const parsed=gikaInterpretationSchema.parse(body);if(!parsed.rescheduleTask)throw Error('Missing preview');return rescheduleEnvelope(parsed.rescheduleTask,{requestId,text:question},parsed.confirmation?.token);}
 const send=(u:{token:string},c:object)=>request(app).post('/api/commands').set('Authorization',`Bearer ${u.token}`).send(c);
 it.each([null,'10:00'])('tomorrow changes only date, preserving actual time %s and all private fields',async time=>{
  const user=await ready({descriptionPlain:'PRIVATE',colorHex:'#123456',estimatedMinutes:45,schedule:{type:'task',dueDate:today(),dueTime:time,timeZone:'Europe/Lisbon',disambiguation:'later'},reminderSpecs:time?[{id:'reminder',minutesBefore:15}]:[],createdAt:'2026-09-01T12:00:00Z',completedAt:null});const ref=db.doc(`users/${user.uid}/activities/${target}`),before=(await ref.get()).data()!;
  const r=await interpret(user);expect(r.body.rescheduleTask).toMatchObject({id:target,dueTime:time,timeZone:'Europe/Lisbon',patch:{dueDate:tomorrow()},revision:1});expect((await ref.get()).data()).toEqual(before);expect((await db.collection('commandReceipts').get()).size).toBe(0);
  const c=await envelope(r.body);expect(c.payload).toEqual({dueDate:tomorrow()});await send(user,c).expect(200);const after=(await ref.get()).data()!;
  expect(after.schedule).toEqual({...before.schedule,dueDate:tomorrow()});for(const f of ['title','descriptionPlain','categoryId','colorHex','estimatedMinutes','reminderSpecs','createdAt','completedAt','status','seriesId','occurrenceKey'])expect(after[f]).toEqual(before[f]);expect(after.revision).toBe(2);expect((await db.collection(`users/${user.uid}/activities`).get()).size).toBe(1);expect((await db.doc(`commandReceipts/${user.uid}_${id}`).get()).data()?.gikaReschedule.task).toEqual(r.body.rescheduleTask);
 });
 it('explicit optional time changes only dueDate and dueTime',async()=>{
  const user=await ready();state.model={interpret:async()=>[{...call(),args:{...call().args,patch:{dueDate:tomorrow(),dueTime:'19:00'}}}]};const q='Move Academia para amanhã às 19h',r=await interpret(user,id,q);await send(user,await envelope(r.body,id,q)).expect(200);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toMatchObject({title:'Academia',schedule:{dueDate:tomorrow(),dueTime:'19:00',timeZone:zone},revision:2});
 });
 it.each(['sexta','segunda','2026-10-10','10/10/2026'])('destination civil %s validated independently of model',async expression=>{
  const user=await ready();const q=`Move Academia para ${expression}`;const {resolveRescheduleIntent}=await import('../../server/gika/reschedulePolicy');state.model={interpret:async input=>{const intent=resolveRescheduleIntent(q,input.context);if('clarification'in intent)throw Error('Invalid fixture');return [{name:'reschedule_task',args:intent}];}};const r=await interpret(user,id,q);if(r.body.rescheduleTask){await send(user,await envelope(r.body,id,q)).expect(200);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.schedule.dueDate).toBe(r.body.rescheduleTask.patch.dueDate);}else expect(r.body.rescheduleResolution.status).toBe('unchanged');
 });
 it.each(['ambiguous','not_found','partial','unsupported','unchanged'])('%s resolution never writes/receipts',async status=>{
  const user=await ready(),ref=db.doc(`users/${user.uid}/activities/${target}`);if(status==='ambiguous')await seedTask(user.uid,'two',today(),'academia',{status:'completed'});if(status==='not_found')await ref.update({title:'Outro'});if(status==='partial')await db.doc(`users/${user.uid}/series/incomplete`).set({state:'active'});if(status==='unsupported')await ref.update({seriesId:'series'});if(status==='unchanged')state.model={interpret:async()=>[{...call(),args:{...call().args,patch:{dueDate:today()}}}]};const before=(await ref.get()).data(),r=await interpret(user,id,status==='unchanged'?'Move Academia para hoje':text);expect(r.body).not.toHaveProperty('rescheduleTask');expect(r.body.rescheduleResolution.status).toBe(status);expect((await ref.get()).data()).toEqual(before);expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
 it('saturated read does not quietly select target',async()=>{
  const user=await ready();await Promise.all(Array.from({length:49},(_,i)=>seedTask(user.uid,`saturated-${i}`,today(),`Outro ${i}`)));const r=await interpret(user);expect(r.body.rescheduleResolution.status).toBe('partial');expect(r.body).not.toHaveProperty('rescheduleTask');expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
 it('sequential/concurrent/lost ack repeat one receipt after target leaves old day',async()=>{
  const user=await ready(),r=await interpret(user),c=await envelope(r.body);const acks=await Promise.all([send(user,c).expect(200),send(user,c).expect(200)]);expect(acks.map(a=>a.body.result).sort()).toEqual(['alreadyApplied','applied']);state.model={interpret:async()=>{throw Error('No provider after receipt');}};const recovered=await interpret(user);expect(recovered.body.rescheduleTask).toEqual(r.body.rescheduleTask);await send(user,await envelope(recovered.body)).expect(200).expect(r=>expect(r.body).toMatchObject({result:'alreadyApplied',revision:2,entityId:target}));await send(user,{...c,payload:{dueDate:today()}}).expect(409);await ask(user.token,{requestId:id,text:'Move Academia para segunda'}).expect(409);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);expect((await db.collection('commandReceipts').get()).size).toBe(1);
 });
 it('new intentional request may move again with its own identity',async()=>{
  const user=await ready(),r=await interpret(user);await send(user,await envelope(r.body)).expect(200);const nextId=crypto.randomUUID(),q='Move Academia amanhã para hoje';state.model={interpret:async()=>[{name:'reschedule_task',args:{title:'Academia',date:tomorrow(),patch:{dueDate:today()}}}]};const next=await interpret(user,nextId,q);await send(user,await envelope(next.body,nextId,q)).expect(200);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()).toMatchObject({revision:3,schedule:{dueDate:today()}});
 });
 it('revision change between preview and commit preserves later edit, no current leak',async()=>{
  const user=await ready(),r=await interpret(user),c=await envelope(r.body),ref=db.doc(`users/${user.uid}/activities/${target}`);await ref.update({revision:2,descriptionPlain:'LATER_PRIVATE',title:'Later'});const failed=await send(user,c).expect(409);expect(failed.body.code).toBe('REVISION_CONFLICT');expect(failed.body.details?.current).toBeUndefined();expect((await ref.get()).data()).toMatchObject({title:'Later',descriptionPlain:'LATER_PRIVATE',revision:2,schedule:{dueDate:today()}});expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
 it('other UID cannot change or recover; same operation in own account remains isolated',async()=>{
  const a=await ready(),b=await account(),r=await interpret(a),c=await envelope(r.body);await send(b,c).expect(422);await send(a,c).expect(200);const missing=await interpret(b);expect(missing.body.rescheduleResolution.status).toBe('not_found');await seedTask(b.uid,target,today(),'Academia');const rb=await interpret(b);const cb=await envelope(rb.body);await send(b,cb).expect(200);expect((await db.doc(`commandReceipts/${a.uid}_${id}`).get()).data()?.uid).toBe(a.uid);expect((await db.doc(`commandReceipts/${b.uid}_${id}`).get()).data()?.uid).toBe(b.uid);
 });
 it.each(['upstream','read','command','replay'])('fresh auth at %s refuses mutation/recovery',async stage=>{
  const user=await ready();let spy:ReturnType<typeof vi.spyOn>|undefined;if(stage==='upstream')state.model={interpret:async()=>{await db.doc(`memberships/${user.uid}`).update({state:'suspended'});return [call()];}};if(stage==='read'){const {firestoreReads}=await import('../../server/gika/reads');const original=firestoreReads.read.bind(firestoreReads);spy=vi.spyOn(firestoreReads,'read').mockImplementationOnce(async(...args)=>{const r=await original(...args);await db.doc(`memberships/${user.uid}`).update({state:'suspended'});return r;});}try{if(stage==='command'||stage==='replay'){const r=await interpret(user),c=await envelope(r.body);if(stage==='replay')await send(user,c).expect(200);await db.doc(`memberships/${user.uid}`).update({state:'suspended'});await send(user,c).expect(403);if(stage==='replay')await ask(user.token,{requestId:id,text}).expect(403);}else await ask(user.token,{requestId:id,text}).expect(403);}finally{spy?.mockRestore();}expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(stage==='replay'?2:1);
 });
 it('unknown tools/payload/IDs/inferred time and mixed calls never allow mutation',async()=>{
  const values=[[{...call(),args:{...call().args,activityId:target}}],[{...call(),args:{...call().args,patch:{dueDate:tomorrow(),title:'Other'}}}],[{...call(),args:{...call().args,patch:{dueDate:tomorrow(),dueTime:'19:00'}}}],[{name:'invented',args:{}}],[call(),{name:'get_today',args:{}}]];for(const calls of values){const user=await ready();state.model={interpret:async()=>calls};await ask(user.token,{requestId:crypto.randomUUID(),text}).expect(422);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(1);}expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
 it('function call repeated collapses; direct invalid patch never reaches write',async()=>{
  const user=await ready();state.model={interpret:async()=>[call(),call()]};const r=await interpret(user),c=await envelope(r.body);for(const payload of [{dueDate:tomorrow(),title:'Other'},{dueDate:tomorrow(),timeZone:'UTC'},{dueDate:tomorrow(),dueTime:null}])await send(user,{...c,payload}).expect(422);await send(user,c).expect(200);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);
 });
 it.each(['before','after'])('failure %s commit retries safely',async when=>{
  const user=await ready(),r=await interpret(user),c=await envelope(r.body),original=db.runTransaction.bind(db),spy=vi.spyOn(db,'runTransaction');if(when==='before')spy.mockRejectedValueOnce(new Error('Fixture precommit'));else spy.mockImplementationOnce(async(...args:Parameters<typeof db.runTransaction>)=>{await original(...args);throw Error('Fixture lost acknowledgement');});try{await send(user,c).expect(503);}finally{spy.mockRestore();}await send(user,c).expect(200).expect(r=>expect(r.body.result).toBe(when==='before'?'applied':'alreadyApplied'));expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);expect((await db.collection('commandReceipts').get()).size).toBe(1);
 });
 it('no-op direct command and recurrence guard do not increment revision',async()=>{
  const user=await ready(),r=await interpret(user),c=await envelope(r.body),ref=db.doc(`users/${user.uid}/activities/${target}`);await send(user,{...c,payload:{dueDate:today()}}).expect(422);await ref.update({seriesId:'series'});await send(user,c).expect(422);expect((await ref.get()).data()?.revision).toBe(1);expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
 it('missing auth and model narrative do not create fake success; incorrect create denied',async()=>{
  const user=await ready();await request(app).post('/api/gika/respond').send({requestId:id,text}).expect(401);state.model={interpret:async()=>[]};const r=await interpret(user);expect(r.body.text).toContain('Não movi');expect(r.body).not.toHaveProperty('rescheduleTask');state.model={interpret:async()=>[{name:'create_task',args:{title:'Por favor, joga Academia',dueDate:tomorrow(),dueTime:null}}]};const wrong=await interpret(user,crypto.randomUUID(),'Por favor, joga Academia para amanhã');expect(wrong.body).not.toHaveProperty('createTask');expect((await db.collection('commandReceipts').get()).size).toBe(0);
 });
});

describe('M5-T2 confirmation contract enforcement and deterministic recovery', () => {
 const target='confirmation-target', text='Move Academia para amanhã';
 const today=()=>Temporal.Now.instant().toZonedDateTimeISO(zone).toPlainDate().toString();
 const tomorrow=()=>Temporal.PlainDate.from(today()).add({days:1}).toString();
 async function ready(){const user=await account();await seedTask(user.uid,target,today(),'Academia');state.model={interpret:async()=>[{name:'reschedule_task',args:{title:'Academia',date:null,patch:{dueDate:tomorrow()}}}]};return user;}
 async function preview(user:{token:string}){const r=await ask(user.token,{requestId:id,text}).expect(200);const parsed=gikaInterpretationSchema.parse(r.body);expect(parsed.confirmation?.policy.kind).toBe('confirm');const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');return {response:r.body,c:await rescheduleEnvelope(parsed.rescheduleTask!,{requestId:id,text},parsed.confirmation!.token)};}
 const send=(user:{token:string},c:object)=>request(app).post('/api/commands').set('Authorization',`Bearer ${user.token}`).send(c);
 it('preview is read-only; no receipt; missing confirmation cannot mutate',async()=>{
  const user=await ready(),{response,c}=await preview(user);expect(response.confirmation.summary.changedFields).toEqual(['dueDate']);expect((await db.collection('commandReceipts').get()).size).toBe(0);
  await send(user,{...c,gikaReschedule:{requestTextHash:c.gikaReschedule!.requestTextHash}}).expect(422);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(1);
 });
 it('approved preview cannot change target, patch, revision, identity or signature before commit',async()=>{
  const user=await ready(),{c}=await preview(user);await seedTask(user.uid,'other',today(),'Other');
  const [encoded,signature]=c.gikaReschedule!.confirmationToken!.split('.');const claims=JSON.parse(Buffer.from(encoded!,'base64url').toString());claims.preview.action.task.id='other';claims.preview.action.task.patch.dueDate=today();
  for(const value of [{...c,entityId:'other'},{...c,payload:{dueDate:today()}},{...c,expectedRevision:2},{...c,operationId:crypto.randomUUID()},{...c,gikaReschedule:{...c.gikaReschedule!,confirmationToken:`${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`}}]) await send(user,value).expect(422);
  expect((await db.collection('commandReceipts').get()).size).toBe(0);for(const entity of [target,'other'])expect((await db.doc(`users/${user.uid}/activities/${entity}`).get()).data()?.revision).toBe(1);
 });
 it('another UID with same entity ID cannot reuse proof or see recovery',async()=>{
  const a=await ready(),b=await account(),{c}=await preview(a);await seedTask(b.uid,target,today(),'Academia');await send(b,c).expect(422);
  await request(app).post('/api/gika/recover-confirmation').set('Authorization',`Bearer ${b.token}`).send({requestId:id,text}).expect(409);expect((await db.doc(`users/${b.uid}/activities/${target}`).get()).data()?.revision).toBe(1);
 });
 it('receipt-only missing recovery never invokes model; concurrent commits/repeated confirms retain original seal',async()=>{
  const user=await ready(),{response,c}=await preview(user);const calls=state.inputs.length;
  await request(app).post('/api/gika/recover-confirmation').set('Authorization',`Bearer ${user.token}`).send({requestId:id,text}).expect(409);expect(state.inputs).toHaveLength(calls);
  const acks=await Promise.all([send(user,c).expect(200),send(user,c).expect(200)]);expect(acks.map(r=>r.body.result).sort()).toEqual(['alreadyApplied','applied']);
  state.model={interpret:async()=>{throw Error('No model on confirmation');}};
  const recovered=await request(app).post('/api/gika/recover-confirmation').set('Authorization',`Bearer ${user.token}`).send({requestId:id,text}).expect(200);expect(recovered.body).toEqual(response.confirmation);
  await send(user,c).expect(200).expect(r=>expect(r.body.result).toBe('alreadyApplied'));expect(state.inputs).toHaveLength(calls);expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);expect((await db.collection('commandReceipts').get()).size).toBe(1);
 });
 it('committed replay survives expiration/key rotation; uncommitted expired preview never writes',async()=>{
  const user=await ready(),{c}=await preview(user);await send(user,c).expect(200);
  const realNow=Date.now,spy=vi.spyOn(Date,'now').mockImplementation(()=>realNow()+16*60_000);
  vi.stubEnv('SCHEDULER_HMAC_SECRET','test-rotated-server-signing-only');
  try{await send(user,c).expect(200).expect(r=>expect(r.body.result).toBe('alreadyApplied'));}finally{spy.mockRestore();vi.unstubAllEnvs();}
  const nextId=crypto.randomUUID();const r=await ask(user.token,{requestId:nextId,text:'Move Academia amanhã para hoje'}); // model still resolves source today: no executable new preview.
  expect(r.body.confirmation).toBeUndefined();
  const {createConfirmationSigner}=await import('../../server/gika/confirmation');
  const {rescheduleEnvelope}=await import('../../packages/domain/src/gikaReschedule');
  const descriptor={id:target,title:'Academia',dueDate:tomorrow(),dueTime:null,timeZone:zone,revision:2,patch:{dueDate:today()}};
  // Production signer with the same explicit ephemeral configured key; otherwise test emulator key unavailable.
  vi.stubEnv('SCHEDULER_HMAC_SECRET','test-expired-server-signing-only');
  try{const {createHmac}=await import('node:crypto');const signer=createConfirmationSigner(createHmac('sha256',process.env.SCHEDULER_HMAC_SECRET!).update('leve:gika-confirmation:v1').digest(),()=>realNow()-16*60_000);const sealed=signer.issue(user.uid,{requestId:nextId,text:'Move Academia amanhã para hoje'},descriptor,{kind:'confirm',risk:'low',reason:'RESCHEDULE_PREVIEW_REQUIRED'});await send(user,await rescheduleEnvelope(descriptor,{requestId:nextId,text:'Move Academia amanhã para hoje'},sealed.token)).expect(409).expect(r=>expect(r.body.code).toBe('GIKA_CONFIRMATION_EXPIRED'));}finally{vi.unstubAllEnvs();}
  expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(2);expect((await db.collection('commandReceipts').get()).size).toBe(1);
 });
 it('unauthenticated recovery is blocked and legacy exact receipts remain replayable without new grant',async()=>{
  await request(app).post('/api/gika/recover-confirmation').send({requestId:id,text}).expect(401);
  const user=await ready(),{c}=await preview(user),legacy={...c,gikaReschedule:{requestTextHash:c.gikaReschedule!.requestTextHash}};
  const {commandHash}=await import('../../server/commands/identity');const now=new Date().toISOString();await db.doc(`commandReceipts/${user.uid}_${id}`).set({uid:user.uid,hash:commandHash(legacy),response:{operationId:id,entityId:target,revision:2,serverTime:now,result:'applied'}});
  await send(user,legacy).expect(200).expect(r=>expect(r.body.result).toBe('alreadyApplied'));expect((await db.doc(`users/${user.uid}/activities/${target}`).get()).data()?.revision).toBe(1);
 });
});
