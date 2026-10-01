import { describe,it,expect } from 'vitest';
import { rescheduleTaskArgsSchema,applyReschedulePatch,rescheduleEnvelope } from '../../packages/domain/src/gikaReschedule';
import { resolveRescheduleIntent,validateReschedule,resolveReschedule } from '../../server/gika/reschedulePolicy';
const context={today:'2026-10-01',timeZone:'America/Sao_Paulo',weekStartsOn:1 as const};
const schedule={type:'task' as const,dueDate:context.today,dueTime:'10:00',timeZone:'Europe/Lisbon',disambiguation:'later' as const};
const item={id:'target',title:'Academia',revision:3,kind:'task' as const,status:'pending' as const,schedule,seriesId:null,occurrenceKey:null};
const read={startDate:context.today,endDate:context.today,timeZone:context.timeZone,partial:false,cached:false as const,items:[item]};
describe('M4-T3 deterministic temporal patch',()=>{
 it.each([['Move academia para amanhã','2026-10-02'],['Joga Java pra sexta','2026-10-02'],['Passa Revisar currículo para segunda','2026-10-05'],['Move Academia para 10/10/2026','2026-10-10'],['Move Academia para 2026-10-10','2026-10-10']])('%s', (text,date)=>expect(resolveRescheduleIntent(text,context)).toMatchObject({date:context.today,patch:{dueDate:date}}));
 it('weekday includes today; source day is independent of destination',()=>{
  expect(resolveRescheduleIntent('Move Academia para quinta',context)).toMatchObject({patch:{dueDate:context.today}});
  expect(resolveRescheduleIntent('Move Academia amanhã para segunda',context)).toMatchObject({title:'Academia',date:'2026-10-02',patch:{dueDate:'2026-10-05'}});
 });
 it.each(['Move Academia para segunda que vem','Move Academia para próxima sexta','Move Academia para dia 10','Move Academia','Move todas as tarefas para amanhã','Move Academia para amanhã e conclui Java','Move Academia para 2026-02-30','Move Academia para amanhã às 25h'])('ambiguous/compound invalid %s',text=>expect(resolveRescheduleIntent(text,context)).toHaveProperty('clarification'));
 it('explicit time only; no time inference or unknown fields',()=>{
  expect(resolveRescheduleIntent('Move Academia para amanhã às 19h',context)).toMatchObject({patch:{dueDate:'2026-10-02',dueTime:'19:00'}});
  expect(resolveRescheduleIntent('Move Academia para amanhã',context)).not.toHaveProperty('patch.dueTime');
  const args={title:'Academia',date:null,patch:{dueDate:'2026-10-02'}};expect(rescheduleTaskArgsSchema.safeParse(args).success).toBe(true);
  for(const value of [{...args,activityId:'other'},{...args,patch:{...args.patch,title:'New'}},{...args,patch:{...args.patch,timeZone:'UTC'}},{...args,patch:{}},{...args,patch:{...args.patch,dueTime:null}}])expect(rescheduleTaskArgsSchema.safeParse(value).success).toBe(false);
  expect(()=>validateReschedule({...args,patch:{...args.patch,dueTime:'19:00'}},'Move Academia para amanhã',context)).toThrow();
 });
 it('unique exact target; no-op, none, ambiguous, partial, recurring block descriptor',()=>{
  const intent={title:' academia ',date:context.today,patch:{dueDate:'2026-10-02'}};
  expect(resolveReschedule(intent,read)).toMatchObject({task:{id:'target',revision:3,dueTime:'10:00',timeZone:'Europe/Lisbon',patch:intent.patch}});
  expect(resolveReschedule({...intent,patch:{dueDate:context.today}},read)).toMatchObject({resolution:{status:'unchanged'}});
  for(const r of [{...read,items:[]},{...read,partial:true},{...read,items:[item,{...item,id:'two'}]},{...read,items:[{...item,seriesId:'series'}]}])expect(resolveReschedule(intent,r)).not.toHaveProperty('task');
 });
 it('existing domain keeps every non temporal field, time, zone and missing optional values',()=>{
  const original={title:'Academia',descriptionPlain:'private',categoryId:null,schedule,reminderSpecs:[{id:'reminder',minutesBefore:15}]};
  expect(applyReschedulePatch(original,{dueDate:'2026-10-02'})).toEqual({...original,schedule:{...schedule,dueDate:'2026-10-02'}});
  expect(applyReschedulePatch(original,{dueDate:'2026-10-02',dueTime:'19:00'})).toEqual({...original,schedule:{...schedule,dueDate:'2026-10-02',dueTime:'19:00'}});
  const absent={...original,schedule:{...schedule,dueTime:null},reminderSpecs:[]};expect(applyReschedulePatch(absent,{dueDate:'2026-10-02'}).schedule).toMatchObject({dueTime:null});
 });
 it('existing temporal domain rejects nonexistent and ambiguous local times',()=>{
  const original={title:'Academia',descriptionPlain:'',categoryId:null,reminderSpecs:[],schedule:{...schedule,timeZone:'America/New_York',disambiguation:'reject' as const}};
  expect(()=>applyReschedulePatch(original,{dueDate:'2026-03-08',dueTime:'02:30'})).toThrow();expect(()=>applyReschedulePatch(original,{dueDate:'2026-11-01',dueTime:'01:30'})).toThrow();
 });
 it('software identity, original revision and only requested patch',async()=>{
  const task={id:'target',title:'Academia',dueDate:context.today,dueTime:'10:00',timeZone:schedule.timeZone,revision:3,patch:{dueDate:'2026-10-02'}};
  const req={requestId:'3dad14e9-a25a-48a3-a5ab-d05d277c3991',text:'Move Academia para amanhã'};const c=await rescheduleEnvelope(task,req);expect(c).toMatchObject({command:'activity.update',operationId:req.requestId,entityId:'target',expectedRevision:3,payload:task.patch});expect(await rescheduleEnvelope(task,req)).toEqual(c);
 });
});
it('M4-T3 quoted literals and civil context do not guess title/date',()=>{
 expect(resolveRescheduleIntent('Move "Academia amanhã" para sexta',context)).toMatchObject({title:'Academia amanhã',date:context.today,patch:{dueDate:'2026-10-02'}});
 expect(resolveRescheduleIntent('Move Academia para amanhã',{...context,today:'2026-10-02',timeZone:'Pacific/Kiritimati'})).toMatchObject({patch:{dueDate:'2026-10-03'}});
 expect(resolveReschedule({title:'Acad',date:context.today,patch:{dueDate:'2026-10-02'}},read)).toMatchObject({resolution:{status:'not_found'}});
});
it('M4-T3 no-op with explicit same time; existing completed/canceled states stay eligible, no inferred state edit',()=>{
 expect(resolveReschedule({title:'Academia',date:context.today,patch:{dueDate:context.today,dueTime:'10:00'}},read)).toMatchObject({resolution:{status:'unchanged'}});
 for(const status of ['completed','canceled'] as const)expect(resolveReschedule({title:'Academia',date:context.today,patch:{dueDate:'2026-10-02'}},{...read,items:[{...item,status}]})).toHaveProperty('task');
 const event={...item,kind:'event' as const,schedule:{type:'event' as const,allDay:true as const,startDate:context.today,endDateExclusive:'2026-10-02',timeZone:context.timeZone}};expect(resolveReschedule({title:'Academia',date:context.today,patch:{dueDate:'2026-10-02'}},{...read,items:[event]})).toMatchObject({resolution:{status:'unsupported'}});
});
