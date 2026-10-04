import { describe, expect, it } from 'vitest';
import { completionEnvelope, completeTaskArgsSchema } from '../../packages/domain/src/gikaCompletion';
import { resolveCreationIntent } from '../../server/gika/createPolicy';
import { resolveCompletionIntent, resolveCompletion, validateCompletion } from '../../server/gika/completePolicy';
const context = { today: '2026-10-01', timeZone: 'America/Sao_Paulo', weekStartsOn: 1 as const };
const task = { id: 'target', title: 'Academia', revision: 3, kind: 'task' as const, status: 'pending' as const, schedule: { type: 'task' as const, dueDate: context.today, dueTime: null, timeZone: context.timeZone, disambiguation: 'reject' as const }, seriesId: null, occurrenceKey: null };
const read = { startDate: context.today, endDate: context.today, timeZone: context.timeZone, partial: false, cached: false as const, items: [task] };
describe('M4-T1 deterministic resolution, not model entity selection', () => {
  it('strict args reject IDs, status and unknown payload', () => {
    expect(completeTaskArgsSchema.safeParse({ title: 'Academia', date: null }).success).toBe(true);
    for(const extra of [{entityId:'other'},{status:'pending'},{uid:'other'}]) expect(completeTaskArgsSchema.safeParse({title:'Academia',date:null,...extra}).success).toBe(false);
  });
  it.each(['Terminei academia','Concluí Academia','Marca a tarefa Academia como concluída'])('explicit intention resolves today: %s', text => {
    expect(resolveCompletionIntent(text, context)).toMatchObject({title: expect.stringMatching(/academia/i),date:context.today});
  });
  it('explicit relative weekday civil date is deterministic, model cannot substitute date/title', () => {
    expect(resolveCompletionIntent('Concluí Academia sexta',context)).toMatchObject({title:'Academia',date:'2026-10-02'});
    expect(()=>validateCompletion({title:'Outra',date:null},'Terminei academia',context)).toThrow();
    expect(()=>validateCompletion({title:'academia',date:'2026-10-02'},'Terminei academia',context)).toThrow();
  });
  it('unique title case/trim resolves real ID and current revision', () => expect(resolveCompletion({title:' academia ',date:context.today},read)).toMatchObject({task:{id:task.id,revision:3,title:'Academia'}}));
  it('multiple including already-completed, empty and partial produce no descriptor', () => {
    for (const result of [ {...read,items:[task,{...task,id:'other',status:'completed' as const}]}, {...read,items:[]}, {...read,partial:true}]) expect(resolveCompletion({title:'Academia',date:context.today},result)).not.toHaveProperty('task');
  });
  it('already completed, canceled, series, event never generate mutation', () => {
    for (const item of [{...task,status:'completed' as const},{...task,status:'canceled' as const},{...task,seriesId:'series'}]) expect(resolveCompletion({title:'Academia',date:context.today},{...read,items:[item]})).not.toHaveProperty('task');
  });
  it('stable envelope identity from software, actual entity distinct from operation', async () => {
    const request={requestId:'3dad14e9-a25a-48a3-a5ab-d05d277c3991',text:'Terminei Academia'};
    const descriptor={id:'actual-target',title:'Academia',dueDate:context.today,timeZone:context.timeZone,revision:3};
    const command=await completionEnvelope(descriptor,request);
    expect(command).toMatchObject({command:'activity.setStatus',entityId:descriptor.id,operationId:request.requestId,expectedRevision:3,payload:{status:'completed'}});
    expect(await completionEnvelope(descriptor,request)).toEqual(command);
  });
});

it('explicit amanhã uses adopted civil parser; missing/batch/ambiguous date produce clarification',()=>{
  expect(resolveCompletionIntent('Terminei Academia amanhã',context)).toMatchObject({title:'Academia',date:'2026-10-02'});
  for(const text of ['Terminei','Terminei tarefa','Concluí todas as tarefas','Concluí Academia próxima sexta'])expect(resolveCompletionIntent(text,context)).toHaveProperty('clarification');
});

it('title semantics preserve interior whitespace instead of silently selecting another title',()=>{
  const intent=resolveCompletionIntent('Concluí Estudar  Java hoje',context);
  expect(intent).toMatchObject({title:'Estudar  Java',date:context.today});
  const candidates={...read,items:[{...task,title:'Estudar  Java'}, {...task,id:'other',title:'Estudar Java'}]};
  if('clarification' in intent)throw Error('Unexpected clarification');
  expect(resolveCompletion(intent,candidates)).toMatchObject({task:{id:task.id,title:'Estudar  Java'}});
});

it('polite completion intent cannot become creation through a wrong model tool',()=>{
  for(const text of ['Por favor, terminei Academia hoje','Por favor, marca Academia como concluída hoje','Pode concluir Academia hoje'])expect(resolveCreationIntent(text,context)).not.toHaveProperty('task');
  expect(resolveCreationIntent('Adiciona Terminei Academia amanhã',context)).toHaveProperty('task');
});
