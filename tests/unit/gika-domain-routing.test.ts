import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGikaRouter } from '../../server/gika/router';
import { createGeminiAdapter, geminiPayload } from '../../server/gika/gemini';
import { gikaIntentClassificationSchema } from '../../packages/domain/src/gika';
import type { ModelAdapter, ModelInput } from '../../server/gika/model';
import { AppError } from '../../server/errors';
vi.mock('../../server/platform/firebase.ts',()=>({db:{},adminAuth:{}}));
const context = { today: '2026-10-04', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const input = {text:'Oi',context};
function fixture(model: ModelAdapter) {
  const repository = {authorize:vi.fn().mockResolvedValue(context),read:vi.fn().mockImplementation(async (_uid,range)=>({...range,partial:false,cached:false,items:[]})),recoverMutation:vi.fn().mockResolvedValue(null)};
  const quota=vi.fn(); const app=express();
  app.use((_req,res,next)=>{res.locals.identity={uid:'synthetic-user'};next();});
  app.use('/gika',createGikaRouter(model,repository,quota));
  app.use((error:AppError,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error.status??422).json({code:error.code}));
  return {repository,quota,ask:(text:string,conversation?:ModelInput['conversation'])=>request(app).post('/gika/respond').send({requestId:crypto.randomUUID(),text,...(conversation?{conversation}:{})})};
}
const cases = [
  ['Oi','SOCIAL'],['Obrigado','SOCIAL'],['Quem é você?','GIKA_META'],['O que você pode fazer?','GIKA_META'],
  ['O que tenho hoje?','AGENDA_QUERY'],['Crie academia amanhã','AGENDA_ACTION'],['Meu dia está uma bagunça','ORGANIZATION_CONVERSATION'],
  ['Me ensine Python','OUT_OF_SCOPE'],['Qual é a capital da França?','OUT_OF_SCOPE'],['Faça uma redação sobre IA','OUT_OF_SCOPE'],
  ['Reserve 1 hora amanhã para eu estudar Python','AGENDA_ACTION'],['Tenho tempo amanhã para estudar Python?','AGENDA_QUERY'],
] as const;
describe('Gika semantic domain classification and software boundary',()=>{
  it.each(cases)('%s is %s; only agenda intents reach existing interpretation',async(text,intent)=>{
    const calls: ModelInput[]=[];
    const adapter=createGeminiAdapter(async payload=>{
      expect(payload.tools[0]!.functionDeclarations[0]!.name).toBe('respond_turn');
      calls.push({text,context,turnOnly:true});
      const conversation=['SOCIAL','GIKA_META','ORGANIZATION_CONVERSATION'].includes(intent);
      const clarification=text.startsWith('Reserve');
      const proposals= intent==='AGENDA_QUERY' ? [{name:'get_day',args:{date:'2026-10-05'}}] : intent==='AGENDA_ACTION' && !clarification ? [{name:'create_task',args:{title:'academia',dueDate:'2026-10-05',dueTime:null}}] : [];
      const functionCall={name:'respond_turn',args:{domainIntent:intent,certain:true,explicitAction:intent==='AGENDA_ACTION',proposals,reply:conversation?'Posso ajudar com sua agenda e organização no Leve.':clarification?'Tarefas simples têm um horário, sem duração. Quer adicionar estudar Python amanhã?':null}};
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{functionCall}]}}]});
    });
    const f=fixture(adapter),response=await f.ask(text);
    expect(response.status).toBe(200);expect(response.body.domainIntent).toBe(intent);expect(f.quota).toHaveBeenCalledTimes(1);
    if(!['AGENDA_QUERY','AGENDA_ACTION'].includes(intent)){
      expect(calls).toHaveLength(1);expect(f.repository.read).not.toHaveBeenCalled();expect(response.body.reads).toEqual([]);expect(response.body).not.toHaveProperty('createTask');
    }
    if(intent==='OUT_OF_SCOPE'){expect(response.body.text).toContain('agenda e organização');expect(response.body.text).not.toMatch(/Paris|for\s|redação pronta/);}
    if(intent==='AGENDA_QUERY'){expect(response.body.reads).toHaveLength(1);expect(response.body).not.toHaveProperty('createTask');}
    if(text.startsWith('Crie'))expect(response.body.createTask.title).toBe('academia');
    if(text.startsWith('Reserve')){expect(response.body.intent).toBe('agenda_action');expect(response.body).not.toHaveProperty('createTask');}
  });
  it.each(['SOCIAL','OUT_OF_SCOPE','AGENDA_ACTION'])('uncertain %s never reads or proposes a mutation',async intent=>{
    const model={classify:vi.fn().mockResolvedValue({intent,certain:false,reply:null}),interpret:vi.fn()};
    const f=fixture(model),response=await f.ask('Talvez isso amanhã');expect(response.status).toBe(200);expect(model.interpret).not.toHaveBeenCalled();expect(f.repository.read).not.toHaveBeenCalled();expect(response.body).not.toHaveProperty('createTask');
  });
  it('missing classifier fails closed, never reaches an action fallback',async()=>{
    const model={interpret:vi.fn()},f=fixture(model);const response=await f.ask('Crie academia amanhã');expect(response.status).toBe(200);expect(model.interpret).not.toHaveBeenCalled();expect(response.body).not.toHaveProperty('createTask');
  });
  it('revocation during classification prevents conversation or agenda output',async()=>{
    const model={classify:vi.fn(async()=>{f.repository.authorize.mockRejectedValue(new AppError(403,'FORBIDDEN','Conta indisponível.'));return {intent:'SOCIAL' as const,certain:true,reply:'Oi'};}),interpret:vi.fn()};
    const f=fixture(model);expect((await f.ask('Oi')).status).toBe(403);expect(model.interpret).not.toHaveBeenCalled();expect(f.repository.read).not.toHaveBeenCalled();
  });
  it('query classifier cannot authorize a mutation tool',async()=>{
    const model={classify:vi.fn().mockResolvedValue({intent:'AGENDA_QUERY',certain:true,reply:null}),interpret:vi.fn().mockResolvedValue([{name:'create_task',args:{title:'X',dueDate:null,dueTime:null}}])};
    const f=fixture(model);expect((await f.ask('Tenho tempo amanhã?')).status).toBe(422);expect(f.repository.read).not.toHaveBeenCalled();
  });
  it('out-of-scope generated content is never displayed or interpreted',async()=>{
    const model={classify:vi.fn().mockResolvedValue({intent:'OUT_OF_SCOPE',certain:true,reply:null}),interpret:vi.fn().mockResolvedValue([{name:'respond_conversation',args:{text:'for x in range(10):'}}])};
    const f=fixture(model),response=await f.ask('Me ensine Python');expect(response.body.text).not.toContain('range');expect(model.interpret).not.toHaveBeenCalled();
  });
  it('classifies using the single schema with no agenda functions or private context',()=>{
    const payload=geminiPayload({...input,classifyOnly:true});expect(payload.tools[0]!.functionDeclarations.map(call=>call.name)).toEqual(['classify_intent']);expect(payload.systemInstruction.parts[0]!.text).toContain('Não use listas de palavras');expect(payload.systemInstruction.parts[0]!.text).toContain('A ordem das informações não importa');expect(payload.systemInstruction.parts[0]!.text).toContain('eu quero agendar para amanhã às 7 horas da noite é ir à academia');
    expect(geminiPayload({...input,agendaIntent:'AGENDA_QUERY'}).tools[0]!.functionDeclarations.map(call=>call.name)).toEqual(['respond_conversation','get_today','get_day','get_week']);
    for(const value of [{intent:'GENERAL',certain:true,reply:null},{intent:'OUT_OF_SCOPE',certain:true,reply:'tutorial'},{intent:'AGENDA_ACTION',certain:true,reply:null,uid:'other'}])expect(gikaIntentClassificationSchema.safeParse(value).success).toBe(false);
  });
  it('adapter rejects malformed or mixed classifications',async()=>{
    const adapter=createGeminiAdapter(async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'classify_intent',args:{intent:'SOCIAL',certain:true,reply:'Oi'}}},{functionCall:{name:'create_task',args:{}}}]}}]}));
    await expect(adapter.classify!(input,new AbortController().signal)).rejects.toMatchObject({code:'GIKA_POLICY'});
  });
});


describe('explicit current request after another conversation domain',()=>{
  const current='então agende para amanhã ir à academia às 7 horas da noite';
  const previous=[['SOCIAL','Oi'],['GIKA_META','Quem é você?'],['OUT_OF_SCOPE','gera um código em Python para mim'],['ORGANIZATION_CONVERSATION','Meu dia está cheio']] as const;
  it.each(previous)('%s never overrides a complete current action',async(_scope,first)=>{
    const payloads:ReturnType<typeof geminiPayload>[]=[];
    const model=createGeminiAdapter(async payload=>{
      payloads.push(payload);
      const args={domainIntent:'AGENDA_ACTION',certain:true,explicitAction:true,reply:null,proposals:[{name:'create_task',args:{title:'ir à academia',dueDate:'2026-10-05',dueTime:'19:00'}}]};
      return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'respond_turn',args}}]}}]});
    });
    const f=fixture(model),response=await f.ask(current,[{role:'user',text:first},{role:'assistant',text:'Posso ajudar com sua agenda.'}]);
    expect(response.status).toBe(200);expect(response.body.domainIntent).toBe('AGENDA_ACTION');expect(response.body.createTask).toMatchObject({title:'ir à academia',dueDate:'2026-10-05',dueTime:'19:00'});
    expect(payloads).toHaveLength(1);expect(payloads[0]!.contents.at(-1)).toEqual({role:'user',parts:[{text:current}]});expect(payloads[0]!.contents).toHaveLength(3);expect(f.repository.read).not.toHaveBeenCalled();
  });
  it('a previous explicit action does not authorize a current ambiguous reply',async()=>{
    const model={classify:vi.fn().mockResolvedValue({intent:'AGENDA_ACTION',certain:false,reply:null}),interpret:vi.fn()};
    const f=fixture(model),response=await f.ask('Então isso',[{role:'user',text:current},{role:'assistant',text:'Posso ajudar.'}]);
    expect(response.body).not.toHaveProperty('createTask');expect(model.interpret).not.toHaveBeenCalled();
  });
});


it.each([
 ['Me ensine Python','Então reserve amanhã das 19h às 20h para estudar Python'],
 ['Qual a capital da França?','Então me lembre amanhã de pesquisar isso'],
])('unsupported/incomplete fields after %s still route current %s as ACTION without invented effects',async(first,current)=>{
 const model={classify:vi.fn().mockResolvedValue({intent:'AGENDA_ACTION',certain:true,reply:null,currentAction:null}),interpret:vi.fn().mockResolvedValue([{name:'respond_conversation',args:{text:'Posso adicionar uma tarefa com horário. Confirme os detalhes para usar sua agenda.'}}])};
 const f=fixture(model),response=await f.ask(current,[{role:'user',text:first},{role:'assistant',text:'Eu fico focada na sua agenda e organização no Leve.'}]);
 expect(response.status).toBe(200);expect(response.body.domainIntent).toBe('AGENDA_ACTION');expect(response.body.intent).toBe('agenda_action');expect(response.body).not.toHaveProperty('createTask');expect(f.repository.read).not.toHaveBeenCalled();
});


it('social then supported literal creation stays current-turn ACTION',async()=>{
 const model={classify:vi.fn().mockResolvedValue({intent:'AGENDA_ACTION',certain:true,reply:null,currentAction:null}),interpret:vi.fn().mockResolvedValue([{name:'create_task',args:{title:'academia',dueDate:'2026-10-05',dueTime:'19:00'}}])};
 const f=fixture(model),response=await f.ask('Adicione academia amanhã às 19h',[{role:'user',text:'Oi'},{role:'assistant',text:'Oi!'}]);
 expect(response.status).toBe(200);expect(response.body.domainIntent).toBe('AGENDA_ACTION');expect(response.body.createTask).toMatchObject({title:'academia',dueTime:'19:00'});
});

it('standalone natural scheduling request has no history dependency',async()=>{
 const current='agende para amanhã ir à academia às 7 horas da noite';
 const model={classify:vi.fn().mockResolvedValue({intent:'AGENDA_ACTION',certain:true,reply:null,currentAction:{kind:'create_task',sourceText:current,requestExpression:'agende',title:'ir à academia',dateExpression:'amanhã',timeExpression:'às 7 horas da noite'}}),interpret:vi.fn()};
 const f=fixture(model),response=await f.ask(current);
 expect(response.status).toBe(200);expect(response.body.domainIntent).toBe('AGENDA_ACTION');expect(response.body.createTask).toMatchObject({title:'ir à academia',dueDate:'2026-10-05',dueTime:'19:00'});expect(model.interpret).not.toHaveBeenCalled();
});
