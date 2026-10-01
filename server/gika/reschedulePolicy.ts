import { Temporal } from '@js-temporal/polyfill';
import { rescheduleTaskArgsSchema,rescheduleDescriptorSchema,type RescheduleDescriptor,type RescheduleResolution } from '../../packages/domain/src/gikaReschedule.ts';
import { scheduleInstants } from '../../packages/domain/src/content.ts';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import { resolveCompletionIntent } from './completePolicy.ts';
import { resolveCreationIntent } from './createPolicy.ts';
import { GikaFault,type ModelContext } from './model.ts';
const key=(text:string)=>text.trim().toLocaleLowerCase('pt-BR');
const prefix=/^(?:por favor[, ]+)?(?:pode\s+)?(?:move|mova|mover|joga|jogue|passa|passe|reagenda|reagende|muda|mude)(?:\s+(?:a\s+)?tarefa)?\s+/iu;
const quotes:Record<string,string>={'"':'"',"'":"'",'“':'”','‘':'’'};
export const isRescheduleRequest=(text:string)=>prefix.test(text.trim());
export function resolveRescheduleIntent(text:string,context:ModelContext):{title:string;date:string;patch:{dueDate:string;dueTime?:string}}|{clarification:string}{
 const clarify={clarification:'Qual tarefa você quer mover e para qual data? Informe dia, mês e ano se houver dúvida.'};
 const source=text.trim(),match=source.match(prefix);if(!match)return clarify;
 const rest=source.slice(match[0].length);let closing:string|undefined;const separators:number[]=[];
 for(let i=0;i<rest.length;i++){const c=rest[i]!;if(closing){if(c===closing)closing=undefined;continue;}if(quotes[c]&&(i===0||/\s/.test(rest[i-1]!))){closing=quotes[c];continue;}if(/^\s+(?:para|pra)\s+/iu.test(rest.slice(i))&&/\S/.test(rest[i-1]??''))separators.push(i);}
 if(closing||separators.length!==1)return clarify;
 const at=separators[0]!,separator=rest.slice(at).match(/^\s+(?:para|pra)\s+/iu)!;
 const old=rest.slice(0,at).trim(),next=rest.slice(at+separator[0].length).trim().replace(/[.!]$/u,'');
 const timeOnly=next.match(/^(?:[aà]s\s+)?(\d{1,2}(?::[0-5]\d|h(?:[0-5]\d)?)?)$/iu);
 // Accept a complete temporal expression only; never turn leftover instructions into a partial action.
 if(!timeOnly&&!/^(?:hoje|amanh[aã]|depois de amanh[aã]|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})(?:\s+[aà]s\s+\d{1,2}(?::[0-5]\d|h(?:[0-5]\d)?)?)?$/iu.test(next))return clarify;
 const temporal=resolveCreationIntent(`Adiciona Seletor de data ${timeOnly?`hoje às ${timeOnly[1]}`:next}`,context);if(!temporal.task?.dueDate||temporal.task.title!=='Seletor de data')return clarify;
 if(Math.abs(Temporal.PlainDate.from(context.today).until(Temporal.PlainDate.from(temporal.task.dueDate)).days)>366)return clarify;
 let intent;
 if(quotes[old[0]??'']){const end=old.indexOf(quotes[old[0]!]!,1);if(end<0)return clarify;const title=old.slice(1,end),tail=old.slice(end+1).trim();intent=resolveCompletionIntent(`Terminei Seletor${tail?' '+tail:''}`,context);if('clarification'in intent||intent.title!=='Seletor')return clarify;intent={...intent,title};}
 else intent=resolveCompletionIntent(`Terminei ${old}`,context);
 if('clarification'in intent)return clarify;
 const patch={dueDate:timeOnly?intent.date:temporal.task.dueDate,...(temporal.task.dueTime!==null?{dueTime:temporal.task.dueTime}:{})};
 const valid=rescheduleTaskArgsSchema.safeParse({...intent,patch});return valid.success?{...valid.data,date:intent.date}:clarify;
}
export function validateReschedule(args:unknown,text:string,context:ModelContext){
 const call=rescheduleTaskArgsSchema.parse(args),intent=resolveRescheduleIntent(text,context);if('clarification'in intent)return intent;
 if(key(call.title)!==key(intent.title)||(call.date??context.today)!==intent.date||JSON.stringify(call.patch)!==JSON.stringify(intent.patch))throw new GikaFault('GIKA_POLICY');
 return intent;
}
export function resolveReschedule(intent:{title:string;date:string;patch:{dueDate:string;dueTime?:string}},read:ReadResult,allowRecurring=false):{text:string;task:RescheduleDescriptor;resolution?:never}|{text:string;task?:never;resolution:RescheduleResolution}{
 if(read.startDate!==intent.date||read.endDate!==intent.date)throw new GikaFault('GIKA_INVALID_RESPONSE');
 const candidates=read.items.filter(item=>key(item.title)===key(intent.title));
 const options=candidates.map(item=>({id:item.id,title:item.title,dueDate:item.schedule.type==='task'?item.schedule.dueDate:item.schedule.startDate,status:item.status}));
 const state=(status:RescheduleResolution['status'],text:string)=>({text,resolution:{status,candidates:options}});
 if(read.partial)return state('partial','Esta consulta está incompleta. Confira sua agenda para mover a tarefa.');
 if(!candidates.length)return state('not_found',`Não encontrei uma tarefa chamada ${intent.title} nesse dia. Informe o título e o dia da tarefa.`);
 if(candidates.length>1)return state('ambiguous',`Encontrei ${candidates.length} itens chamados ${intent.title}. Qual você quer mover?`);
 const target=candidates[0]!;
 if(!allowRecurring&&(target.seriesId||target.occurrenceKey))return state('unsupported','Essa tarefa faz parte de uma rotina. Quer mover só esta ocorrência ou também as próximas? Escolha pela sua agenda.');
 if(target.kind!=='task'||target.schedule.type!=='task'||!target.schedule.dueDate)return state('unsupported','Posso mover uma tarefa simples por vez. Para este item, use sua agenda.');
 const time=intent.patch.dueTime??target.schedule.dueTime;
 if(target.schedule.dueDate===intent.patch.dueDate&&target.schedule.dueTime===time)return state('unchanged','Essa tarefa já está nessa data e horário.');
 try{scheduleInstants({...target.schedule,dueDate:intent.patch.dueDate,dueTime:time});}catch{return state('clarify','Esse horário não existe ou é ambíguo nesse fuso. Escolha outra data ou horário pela sua agenda.');}
 return {text:'Confira a nova data antes de mover a tarefa.',task:rescheduleDescriptorSchema.parse({id:target.id,title:target.title,dueDate:target.schedule.dueDate,dueTime:target.schedule.dueTime,timeZone:target.schedule.timeZone,revision:target.revision,patch:intent.patch})};
}
