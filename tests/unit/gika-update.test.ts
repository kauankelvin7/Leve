import { describe,expect,it } from 'vitest';
import { updateTaskArgsSchema,updateEnvelope,applyTitlePatch } from '../../packages/domain/src/gikaUpdate';
import { resolveUpdateIntent,validateUpdate,resolveUpdate } from '../../server/gika/updatePolicy';
const context={today:'2026-10-01',timeZone:'America/Sao_Paulo',weekStartsOn:1 as const};
const activity={id:'target',title:'Academia',revision:3,kind:'task' as const,status:'pending' as const,schedule:{type:'task' as const,dueDate:context.today,dueTime:'10:00',timeZone:'Europe/Lisbon',disambiguation:'later' as const},seriesId:null,occurrenceKey:null};
const read={startDate:context.today,endDate:context.today,timeZone:context.timeZone,partial:false,cached:false as const,items:[activity]};
describe('M4-T2 title-only patch and deterministic authenticated selector',()=>{
 it.each(['Muda "Estudar Java" para "Revisar Java"','Renomeia academia para Treino'])('explicit intention %s',text=>expect(resolveUpdateIntent(text,context)).toMatchObject({title:expect.any(String),date:context.today,patch:{title:expect.any(String)}}));
 it('strict patch rejects temporal, unknown, arbitrary IDs and no requested fields',()=>{
  const args={title:'Academia',date:null,patch:{title:'Treino'}};
  expect(updateTaskArgsSchema.safeParse(args).success).toBe(true);
  for(const value of [{...args,entityId:'other'},{...args,patch:{title:'Treino',dueDate:'2026-10-02'}},{...args,patch:{descriptionPlain:'new'}},{...args,patch:{}},{...args,patch:{title:''}}])expect(updateTaskArgsSchema.safeParse(value).success).toBe(false);
 });
 it('dates belong to old selector only; quoted literal title retains date words and para',()=>{
  expect(resolveUpdateIntent('Renomeia Academia amanhã para Treino',context)).toMatchObject({title:'Academia',date:'2026-10-02',patch:{title:'Treino'}});
  expect(resolveUpdateIntent('Muda "Academia amanhã" para "Treino para amanhã"',context)).toMatchObject({title:'Academia amanhã',date:context.today,patch:{title:'Treino para amanhã'}});
  for(const text of ['Renomeia','Renomeia Academia','Muda academia para amanhã','Renomeia academia para Treino amanhã','Renomeia todas as tarefas para Treino','Renomeia Academia para Treino e conclui Java'])expect(resolveUpdateIntent(text,context)).toHaveProperty('clarification');
 });
 it('model cannot replace selector or requested patch',()=>{
  for(const args of [{title:'Outra',date:null,patch:{title:'Treino'}},{title:'Academia',date:null,patch:{title:'Inventada'}}])expect(()=>validateUpdate(args,'Renomeia Academia para Treino',context)).toThrow();
 });
 it('unique target retains actual identity, all statuses allowed; exact no-op but case-only is edit',()=>{
  expect(resolveUpdate({title:' academia ',date:context.today,patch:{title:'Treino'}},read)).toMatchObject({task:{id:'target',revision:3,patch:{title:'Treino'}}});
  expect(resolveUpdate({title:'Academia',date:context.today,patch:{title:'Academia'}},read)).toMatchObject({resolution:{status:'unchanged'}});
  expect(resolveUpdate({title:'Academia',date:context.today,patch:{title:'academia'}},read)).toHaveProperty('task');
  for(const status of ['completed','canceled'] as const)expect(resolveUpdate({title:'Academia',date:context.today,patch:{title:'Treino'}},{...read,items:[{...activity,status}]})).toHaveProperty('task');
 });
 it('none, partial, multiple and series/event block any descriptor',()=>{
  for(const result of [{...read,items:[]},{...read,partial:true},{...read,items:[activity,{...activity,id:'second'}]},{...read,items:[{...activity,seriesId:'series'}]}])expect(resolveUpdate({title:'Academia',date:context.today,patch:{title:'Treino'}},result)).not.toHaveProperty('task');
 });
 it('patch application uses existing ActivityInput and preserves every unmentioned field and absent optional keys',()=>{
  const original={title:'Academia',descriptionPlain:'Descrição privada',categoryId:'category',schedule:activity.schedule,reminderSpecs:[{id:'custom',minutesBefore:15}]};
  const updated=applyTitlePatch(original,{title:' Treino '});expect(updated).toEqual({...original,title:'Treino'});expect(updated).not.toHaveProperty('colorHex');expect(updated).not.toHaveProperty('estimatedMinutes');
  const full={...original,colorHex:'#123456',estimatedMinutes:45};expect(applyTitlePatch(full,{title:'Treino'})).toEqual({...full,title:'Treino'});
 });
 it('software request identity and exact revision produce only patch in existing update command',async()=>{
  const task={id:'target',title:'Academia',dueDate:context.today,timeZone:context.timeZone,revision:3,patch:{title:'Treino'}};
  const request={requestId:'3dad14e9-a25a-48a3-a5ab-d05d277c3991',text:'Renomeia Academia para Treino'};
  const c=await updateEnvelope(task,request);expect(c).toMatchObject({command:'activity.update',entityId:'target',operationId:request.requestId,expectedRevision:3,payload:{title:'Treino'}});expect(await updateEnvelope(task,request)).toEqual(c);
 });
});

 it.each(['apaga Java', 'exclui Java', 'reagenda Java', 'terminei Java', 'remove Java'])('mixed action %s requests clarification outside quotes', action => {
  expect(resolveUpdateIntent(`Renomeia Academia para Treino e ${action}`, context)).toHaveProperty('clarification');
  expect(resolveUpdateIntent(`Renomeia Academia para "Treino e ${action}"`, context)).toMatchObject({ patch: { title: `Treino e ${action}` } });
 });

 it.each(['Treino. Apaga Java', 'Treino / reagenda Java', 'Treino e também exclui Java'])('unquoted multi-action %s requests clarification', next => {
  expect(resolveUpdateIntent(`Renomeia Academia para ${next}`, context)).toHaveProperty('clarification');
  expect(resolveUpdateIntent(`Renomeia Academia para "${next}"`, context)).toMatchObject({ patch: { title: next } });
 });

 it.each(['Treino, apaga Java', 'Treino e por favor apaga Java'])('mutation verb %s requests quotes regardless of connector', next => {
  expect(resolveUpdateIntent(`Renomeia Academia para ${next}`, context)).toHaveProperty('clarification');
  expect(resolveUpdateIntent(`Renomeia Academia para "${next}"`, context)).toMatchObject({ patch: { title: next } });
 });
