import { describe, it, expect, vi } from 'vitest';
import { resolveBatchIntent, validateBatch, resolveBatch, classifyBatchAction } from '../../server/gika/batchPolicy';
import { validateToolCalls } from '../../server/gika/createPolicy';
import type { ReadRepository } from '../../server/gika/reads';
const context={today:'2026-10-01',timeZone:'America/Sao_Paulo',weekStartsOn:1 as const};
const request={requestId:'3dad14e9-a25a-48a3-a5ab-d05d277c3991',text:'Move as tarefas de hoje para amanhã'};
const item={id:'one',title:'Java',revision:2,kind:'task' as const,status:'pending' as const,seriesId:null,occurrenceKey:null,schedule:{type:'task' as const,dueDate:context.today,dueTime:'19:00',timeZone:context.timeZone,disambiguation:'reject' as const}};
const read={startDate:context.today,endDate:context.today,timeZone:context.timeZone,partial:false,cached:false as const,items:[item]};
const repository={inspectRecurrence:vi.fn()} as unknown as ReadRepository;
const intent={operation:'reschedule' as const,date:context.today,patch:{dueDate:'2026-10-02'}};
describe('M5-T4 original intent and complete bounded selection',()=>{
 it.each([['Conclui as tarefas de hoje','complete','2026-10-01'],['Move as tarefas de sexta para segunda','reschedule','2026-10-02'],['Move as tarefas de 10/10/2026 para 2026-10-11','reschedule','2026-10-10']])('original civil dates %s',(text,operation,date)=>expect(resolveBatchIntent(text,context)).toMatchObject({operation,date}));
 it.each(['Move todas as tarefas para amanhã','Conclui tudo','Move as tarefas de hoje para segunda que vem','Conclui as tarefas de hoje e exclui Java','Move as tarefas de hoje para amanhã por prioridade','Conclui as tarefas de 2026-02-30'])('incomplete/compound/unavailable filters clarify %s',text=>expect(resolveBatchIntent(text,context)).toHaveProperty('clarification'));
 it('exclusion and exact title preserve literals; scope requires explicit evidence',()=>{
  expect(resolveBatchIntent('Move as tarefas de hoje para amanhã exceto "Academia"',context)).toMatchObject({excludeTitles:['Academia']});
  expect(resolveBatchIntent('Conclui as tarefas chamadas "Java" de hoje, só estas ocorrências',context)).toMatchObject({title:'Java',recurrenceScope:'occurrence'});
  expect(()=>validateBatch({sourceDate:context.today,title:null,excludeTitles:[],scope:'occurrence'},'Conclui as tarefas de hoje',context,'complete')).toThrow();
 });
 it('strict model tool rejects IDs, unknown fields, invented selector and mixed actions; repeated call collapses',()=>{
  const call={name:'batch_complete',args:{sourceDate:context.today,title:null,excludeTitles:[],scope:null}};
  expect(validateToolCalls([call,call])).toHaveLength(1);
  for(const args of [{...call.args,activityId:'one'},{...call.args,categoryId:'school'}])expect(()=>validateToolCalls([{...call,args}])).toThrow();
  expect(()=>validateToolCalls([call,{name:'get_today',args:{}}])).toThrow();
  expect(()=>validateBatch({...call.args,title:'Academia'},'Conclui as tarefas de hoje',context,'complete')).toThrow();
 });
 it('software IDs order stable and patches preserve absence/presence of time',async()=>{
  const selected={...read,items:[{...item,id:'two',schedule:{...item.schedule,dueTime:null}},item]};
  const result=await resolveBatch(intent,selected,repository,'user-a',request);
  expect(result).toHaveProperty('plan');if(!('plan'in result))return;
  expect(result.plan.items.map(i=>i.id)).toEqual(['one','two']);
  expect(result.plan.items.map(i=>i.before.dueTime)).toEqual(['19:00',null]);
  expect(result.plan.items.every(i=>!('dueTime'in i.patch))).toBe(true);
  expect(await resolveBatch(intent,selected,repository,'user-a',request)).toEqual(result);
  const other=await resolveBatch(intent,selected,repository,'user-b',request);expect(other).not.toEqual(result);
 });
 it('partial, overcap, none and no-op prevent entire preview; never truncates',async()=>{
  for(const r of [{...read,partial:true},{...read,items:[]},{...read,items:Array.from({length:6},(_,i)=>({...item,id:`item${i}`}))}])expect(await resolveBatch(intent,r,repository,'user-a',request)).toHaveProperty('clarification');
  expect(await resolveBatch({...intent,patch:{dueDate:context.today}},read,repository,'user-a',request)).toHaveProperty('clarification');
 });
 it('recurrence is not silently omitted; future/all deny; missing scope clarifies',async()=>{
  const recurring={...read,items:[{...item,seriesId:'series',occurrenceKey:context.today}]};
  expect(await resolveBatch(intent,recurring,repository,'user-a',request)).toHaveProperty('clarification');
  for(const recurrenceScope of ['future','all'] as const)expect(await resolveBatch({...intent,recurrenceScope},recurring,repository,'user-a',request)).toHaveProperty('clarification');
 });
 it('only exact pending tasks participate, exclusions are exact; unknown day context rejected',async()=>{
  const selected={...read,items:[item,{...item,id:'done',status:'completed' as const},{...item,id:'other',title:'Java avançado'}]};
  const result=await resolveBatch({...intent,title:' java '},selected,repository,'user-a',request);expect(result).toMatchObject({plan:{items:[{id:'one'}]}});
  expect(await resolveBatch({...intent,title:'Java',excludeTitles:['Java']},selected,repository,'user-a',request)).toHaveProperty('clarification');
  await expect(resolveBatch(intent,{...read,startDate:'2026-10-02'},repository,'user-a',request)).rejects.toThrow();
 });
 it('batch policy registration does not allow generic bulk or unverified recurrence',()=>{
  expect(classifyBatchAction({action:'complete',count:5,complete:true,recurrenceVerified:true})).toBe('confirm');
  for(const bad of [{action:'delete',count:1},{action:'complete',count:6},{action:'complete',count:1,complete:false},{action:'complete',count:1,recurrenceVerified:false},{action:'complete',count:1,scope:'future'}])expect(classifyBatchAction({complete:true,recurrenceVerified:true,...bad})).toBe('deny');
 });
});

// No emulator/provider: HTTP proof isolates router contract from the existing read repository.
const dbFixture=vi.hoisted(()=>({getAll:vi.fn(),doc:vi.fn((path:string)=>({path}))}));
vi.mock('../../server/platform/firebase.ts',()=>({db:dbFixture,adminAuth:{}}));
import express from 'express';
import supertest from 'supertest';
import { createGikaRouter } from '../../server/gika/router';
import { AppError } from '../../server/errors';
function httpFixture() {
 const model={interpret:vi.fn()};
 const repo={authorize:vi.fn().mockResolvedValue(context),read:vi.fn().mockResolvedValue(read),recoverMutation:vi.fn().mockResolvedValue(null),recoverBatch:vi.fn().mockResolvedValue(null)};
 const app=express();app.use((_req,res,next)=>{res.locals.identity={uid:'user-a',email_verified:true};next();});app.use('/gika',createGikaRouter(model,repo,async()=>{}));
 app.use((error:AppError,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status??500).json({code:error.code}));
 return {http:supertest(app),model,repo};
}
describe('M5-T4 bounded recovery precedes provider and auth is fresh',()=>{
 it('receipt-only endpoint never invokes model, list read or signer',async()=>{
  const f=httpFixture();f.repo.recoverBatch.mockResolvedValue({confirmation:{plan:{},token:'original'},result:{pending:1}});
  const response=await f.http.post('/gika/recover-batch').send(request);
  expect(response.status).toBe(200);expect(response.body.confirmation.token).toBe('original');
  expect(f.repo.authorize).toHaveBeenCalledTimes(2);expect(f.model.interpret).not.toHaveBeenCalled();expect(f.repo.read).not.toHaveBeenCalled();
 });
 it('missing receipt is explicit and cannot re-interpret or invent plan',async()=>{
  const f=httpFixture();const response=await f.http.post('/gika/recover-batch').send(request);
  expect(response.status).toBe(409);expect(f.model.interpret).not.toHaveBeenCalled();expect(f.repo.read).not.toHaveBeenCalled();
 });
 it('lost account permission after receipt lookup rejects old result',async()=>{
  const f=httpFixture();f.repo.authorize.mockResolvedValueOnce(context).mockRejectedValueOnce(new AppError(403,'FORBIDDEN','Conta indisponível.'));
  f.repo.recoverBatch.mockResolvedValue({confirmation:{},result:{}});
  const response=await f.http.post('/gika/recover-batch').send(request);expect(response.status).toBe(403);expect(f.model.interpret).not.toHaveBeenCalled();
 });
 it('partial read produces no batch preview and no command',async()=>{
  const f=httpFixture();f.model.interpret.mockResolvedValue([{name:'batch_reschedule',args:{sourceDate:context.today,title:null,excludeTitles:[],scope:null,dueDate:'2026-10-02',dueTime:null}}]);
  f.repo.read.mockResolvedValue({...read,partial:true});
  const response=await f.http.post('/gika/respond').send(request);
  expect(response.status).toBe(200);expect(response.body).not.toHaveProperty('batchConfirmation');expect(response.body.text).toContain('incompleta');
 });
 it('permission lost after model wait prevents agenda query',async()=>{
  const f=httpFixture();f.repo.authorize.mockResolvedValueOnce(context).mockResolvedValueOnce(context).mockRejectedValueOnce(new AppError(403,'FORBIDDEN','Conta indisponível.'));
  f.model.interpret.mockResolvedValue([{name:'batch_complete',args:{sourceDate:context.today,title:null,excludeTitles:[],scope:null}}]);
  const response=await f.http.post('/gika/respond').send({...request,text:'Conclui as tarefas de hoje'});
  expect(response.status).toBe(403);expect(f.repo.read).not.toHaveBeenCalled();
 });
});

import { firestoreReads } from '../../server/gika/reads';
import { batchEnvelope } from '../../packages/domain/src/gikaBatch';
import { commandHash } from '../../server/commands/identity';
it('bounded receipt recovery retains committed plan, validates canonical hash and never signs renewed proof',async()=>{
 const resolved=await resolveBatch(intent,{...read,items:[item,{...item,id:'two'}]},repository,'user-a',request);if(!('plan'in resolved))throw new Error('missing plan');
 const confirmation={plan:resolved.plan,token:`e30.${'a'.repeat(64)}`};
 const envelope=await batchEnvelope(confirmation,request,0);
 const data={uid:'user-a',hash:commandHash(envelope),response:{operationId:envelope.operationId,entityId:item.id,revision:item.revision+1,serverTime:'2026-10-01T12:00:00Z',result:'applied'},gikaBatch:{...envelope.gikaBatch,confirmation}};
 const docs=Array.from({length:5},(_,index)=>({exists:index===0,id:`user-a_${resolved.plan.items[index]?.operationId ?? 'absent'}`,data:()=>data}));
 dbFixture.getAll.mockResolvedValue(docs);
 const recovered=await firestoreReads.recoverBatch!('user-a',request);
 expect(recovered?.confirmation).toEqual(confirmation);expect(recovered?.result).toMatchObject({alreadyApplied:1,pending:1});expect(dbFixture.getAll.mock.calls.at(-1)).toHaveLength(5);
 data.hash='0'.repeat(64);await expect(firestoreReads.recoverBatch!('user-a',request)).rejects.toThrow('GIKA_INVALID_RESPONSE');
 data.hash=commandHash(envelope);data.uid='user-b';await expect(firestoreReads.recoverBatch!('user-a',request)).rejects.toMatchObject({code:'OPERATION_MISMATCH'});
});
