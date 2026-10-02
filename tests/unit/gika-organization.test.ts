import { describe, expect, it, vi } from 'vitest';
import { planningContext, validateOrganization, organizationPeriod } from '../../server/gika/organizationPolicy';
import { organizationCallSchema } from '../../packages/domain/src/gikaOrganization';
import { geminiPayload } from '../../server/gika/gemini';
import type { ReadResult } from '../../packages/domain/src/gika';
const context = {today:'2026-10-02',timeZone:'America/Sao_Paulo',weekStartsOn:1 as const};
const read = (): ReadResult => ({startDate:context.today,endDate:'2026-10-04',timeZone:context.timeZone,partial:false,cached:false,items:[{id:'real-task',revision:1,title:'Java',kind:'task',status:'pending',seriesId:null,occurrenceKey:null,schedule:{type:'task',dueDate:context.today,dueTime:null,timeZone:context.timeZone,disambiguation:'reject'}}]});
const call = () => ({name:'propose_organization',args:{items:[{ref:0,action:'move',dueDate:'2026-10-03',dueTime:null}]}});
describe('M6 proposal is bounded data, never mutation authority', () => {
  it('resolves daily intent and maps temporary references to exact software identities', () => {
    for(const text of ['Organiza meu dia.','Estou cansado hoje. Reorganiza o que puder.','Como você organizaria minhas tarefas de hoje?'])expect(organizationPeriod(text)).toBe('day');
    expect(validateOrganization(call(),read(),read(),context,'day')).toMatchObject({items:[{id:'real-task',revision:1,before:{dueDate:context.today},after:{dueDate:'2026-10-03'},action:'move'}]});
  });
  it('minimizes provider context: no entity/revision/UID, uses task data as a user part', () => {
    const planning = planningContext(read(),context)!;
    expect(planning.tasks[0]).toEqual({ref:0,title:'Java',status:'pending',dueDate:context.today,dueTime:null,recurring:false});
    const payload = geminiPayload({text:'Organiza meu dia',context,planning});
    expect(JSON.stringify(payload)).not.toContain('real-task');expect(JSON.stringify(payload)).not.toContain('revision');
    expect(payload.contents[0]?.parts).toHaveLength(2);
  });
  it.each(['unknown','duplicate','missing','invented','past','outside','time','noop','stale','partial','cap','recurrence'] as const)('%s cannot form a valid proposal', variant => {
    const proposal=call(),data=read(),fresh=read();
    if(variant==='unknown')Object.assign(proposal.args,{uid:'other'});
    if(variant==='duplicate')proposal.args.items.push({...proposal.args.items[0]!});
    if(variant==='missing')proposal.args.items=[];
    if(variant==='invented')proposal.args.items[0]!.ref=4;
    if(variant==='past')proposal.args.items[0]!.dueDate='2026-10-01';
    if(variant==='outside')proposal.args.items[0]!.dueDate='2026-10-05';
    if(variant==='time')Object.assign(proposal.args.items[0]!,{dueTime:'19:00'});
    if(variant==='noop')proposal.args.items[0]!.dueDate=context.today;
    if(variant==='stale')fresh.items[0]!.revision++;
    if(variant==='partial')fresh.partial=true;
    if(variant==='cap')data.items=Array.from({length:6},(_,index)=>({...data.items[0]!,id:String(index)}));
    if(variant==='recurrence'){data.items[0]!.seriesId='series';fresh.items[0]!.seriesId='series';}
    expect(()=>validateOrganization(proposal,data,fresh,context,'day')).toThrow();
  });
  it('keep is an honest no-op and strict schema rejects persistence fields', () => {
    const proposal=call();proposal.args.items[0]!.action='keep';proposal.args.items[0]!.dueDate=context.today;
    expect(validateOrganization(proposal,read(),read(),context,'day').items[0]?.action).toBe('keep');
    expect(organizationCallSchema.safeParse({...proposal,args:{...proposal.args,command:'activity.update'}}).success).toBe(false);
  });
});

// HTTP contract test: controlled model, read repository only, no persistence entrypoint.

vi.mock('../../server/platform/firebase.ts',()=>({db:{},adminAuth:{}}));
import express from 'express';
import request from 'supertest';
import { createGikaRouter } from '../../server/gika/router';
import { AppError } from '../../server/errors';
function fixture() {
  const data={...read(),endDate:context.today};
  const repository={authorize:vi.fn().mockResolvedValue(context),read:vi.fn().mockResolvedValue(data),recoverMutation:vi.fn().mockResolvedValue(null),recoverBatch:vi.fn().mockResolvedValue(null)};
  const model={interpret:vi.fn().mockResolvedValue([call()])};
  const app=express();app.use((_req,res,next)=>{res.locals.identity={uid:'test-user'};next();});app.use('/gika',createGikaRouter(model,repository));
  app.use((error:AppError,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status??422).json({code:error.code}));
  return {model,repository,http:request(app)};
}
describe('M6-T1 HTTP software resolution before and after model',()=>{
  it('reads today twice, strips private identity and emits only non-executable suggestion',async()=>{
    const f=fixture();const response=await f.http.post('/gika/respond').send({requestId:crypto.randomUUID(),text:'Organiza meu dia'});
    expect(response.status).toBe(200);expect(response.body.organizationPreview.items[0].id).toBe('real-task');expect(response.body.batchConfirmation).toBeUndefined();
    expect(f.repository.read).toHaveBeenCalledTimes(2);expect(f.model.interpret.mock.calls[0]?.[0]).toMatchObject({planning:{tasks:[{ref:0,title:'Java'}]}});
    expect(JSON.stringify(f.model.interpret.mock.calls)).not.toContain('real-task');
  });
  it.each(['partial','cap','empty'])('%s exits without provider or executable preview',async variant=>{
    const f=fixture(),data={...read(),endDate:context.today};
    if(variant==='partial')data.partial=true;
    if(variant==='cap')data.items=Array.from({length:6},(_,index)=>({...data.items[0]!,id:String(index)}));
    if(variant==='empty')data.items=[];
    f.repository.read.mockResolvedValue(data);
    const response=await f.http.post('/gika/respond').send({requestId:crypto.randomUUID(),text:'Organiza meu dia'});
    expect(response.status).toBe(200);expect(response.body.organizationPreview).toBeUndefined();expect(f.model.interpret).not.toHaveBeenCalled();
  });
  it('account revocation after upstream prevents output',async()=>{
    const f=fixture();f.model.interpret.mockImplementation(async()=>{f.repository.authorize.mockRejectedValue(new AppError(403,'FORBIDDEN','Conta indisponível.'));return [call()];});
    expect((await f.http.post('/gika/respond').send({requestId:crypto.randomUUID(),text:'Organiza meu dia'})).status).toBe(403);
  });
  it('narrative or wrong tool cannot become a proposal',async()=>{
    for(const calls of [[],[{name:'create_task',args:{title:'Java',dueDate:context.today,dueTime:null}}]]){
      const f=fixture();f.model.interpret.mockResolvedValue(calls);
      expect((await f.http.post('/gika/respond').send({requestId:crypto.randomUUID(),text:'Organiza meu dia'})).status).toBe(422);
    }
  });
});
