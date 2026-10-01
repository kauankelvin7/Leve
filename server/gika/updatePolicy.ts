import { updateTaskArgsSchema, updateTaskPatchSchema, updateDescriptorSchema, type UpdateDescriptor, type UpdateResolution } from '../../packages/domain/src/gikaUpdate.ts';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import { resolveCompletionIntent } from './completePolicy.ts';
import { GikaFault, type ModelContext } from './model.ts';
const key = (text: string) => text.trim().toLocaleLowerCase('pt-BR');
const prefix = /^(?:por favor[, ]+)?(?:pode\s+)?(?:muda|mude|renomeia|renomeie|renomear|altera|altere)(?:\s+o\s+t[ií]tulo(?:\s+da)?)?(?:\s+(?:a\s+)?tarefa)?\s+/iu;
const dateWord = /(?<![\p{L}\p{N}_])(?:hoje|amanh[aã]|ontem|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])[aà]s\s+\d/iu;
const mutationWord = /(?<![\p{L}\p{N}_])(?:conclu[ií]|concluir|conclua|marca|marque|marcar|complete|completar|adiciona|adicione|adicionar|cria|crie|criar|move|mova|mover|muda|mude|mudar|renomeia|renomeie|renomear|apaga|apague|apagar|exclui|exclua|excluir|remove|remova|remover|reagenda|reagende|reagendar|deleta|delete|deletar|cancela|cancele|cancelar|terminei|reabre|reabra|reabrir|desfaz|desfaça|desfazer)(?![\p{L}\p{N}_])/iu;
const quotes: Record<string,string> = {'"':'"',"'":"'",'“':'”','‘':'’'};
function quoted(text: string): { title: string; tail: string } | null {
  const end = quotes[text[0] ?? '']; if (!end) return null;
  const index = text.indexOf(end, 1); if (index < 0) return null;
  return { title: text.slice(1,index), tail: text.slice(index+1).trim() };
}
export const isUpdateRequest = (text: string) => prefix.test(text.trim());
export function resolveUpdateIntent(text: string, context: ModelContext): {title:string;date:string;patch:{title:string}} | {clarification:string} {
  const clarify = {clarification:'Qual tarefa você quer renomear e qual será o novo título?'};
  const source=text.trim(),match=source.match(prefix);if(!match)return clarify;
  const rest=source.slice(match[0].length).trim();
  let closing: string | undefined;const separators:number[]=[];
  for(let i=0;i<rest.length;i++){
    const char=rest[i]!;
    if(closing){if(char===closing)closing=undefined;continue;}
    if(quotes[char]&&(i===0||/\s/.test(rest[i-1]!))){closing=quotes[char];continue;}
    if(/^\s+para\s+/iu.test(rest.slice(i))&&/\S/.test(rest[i-1]??''))separators.push(i);
  }
  if(closing||separators.length!==1)return clarify;
  const at=separators[0]!,separator=rest.slice(at).match(/^\s+para\s+/iu)!;
  const old=rest.slice(0,at).trim(),next=rest.slice(at+separator[0].length).trim();
  const oldQuote=quoted(old),newQuote=quoted(next);
  if((quotes[old[0]??'']&&!oldQuote)||(quotes[next[0]??'']&&!newQuote)||newQuote?.tail)return clarify;
  if(!newQuote&&(dateWord.test(next)||mutationWord.test(next)))return {clarification:'Informe o novo título entre aspas. Posso renomear uma tarefa por vez.'};
  const patch=updateTaskPatchSchema.safeParse({title:newQuote?.title??next});if(!patch.success)return clarify;
  let intent;
  if(oldQuote){
    const marker='Seletor de tarefa';intent=resolveCompletionIntent(`Terminei ${marker}${oldQuote.tail?' '+oldQuote.tail:''}`,context);
    if('clarification' in intent||intent.title!==marker)return clarify;
    intent={...intent,title:oldQuote.title};
  }else intent=resolveCompletionIntent(`Terminei ${old}`,context);
  if('clarification' in intent)return clarify;
  const valid=updateTaskArgsSchema.safeParse({...intent,patch:patch.data});if(!valid.success)return clarify;
  return {...valid.data,date:intent.date};
}
export function validateUpdate(args:unknown,text:string,context:ModelContext){
  const call=updateTaskArgsSchema.parse(args),intent=resolveUpdateIntent(text,context);
  if('clarification' in intent)return intent;
  if(key(call.title)!==key(intent.title)||(call.date??context.today)!==intent.date||call.patch.title!==intent.patch.title)throw new GikaFault('GIKA_POLICY');
  return intent;
}
export function resolveUpdate(intent:{title:string;date:string;patch:{title:string}},read:ReadResult):{text:string;task:UpdateDescriptor;resolution?:never}|{text:string;task?:never;resolution:UpdateResolution}{
  if(read.startDate!==intent.date||read.endDate!==intent.date)throw new GikaFault('GIKA_INVALID_RESPONSE');
  const candidates=read.items.filter(item=>key(item.title)===key(intent.title));
  const options=candidates.map(item=>({id:item.id,title:item.title,dueDate:item.schedule.type==='task'?item.schedule.dueDate:item.schedule.startDate,status:item.status}));
  const state=(status:UpdateResolution['status'],text:string)=>({text,resolution:{status,candidates:options}});
  if(read.partial)return state('partial','Esta consulta está incompleta. Confira sua agenda para editar a tarefa.');
  if(!candidates.length)return state('not_found',`Não encontrei uma tarefa chamada ${intent.title} nesse dia. Informe o título e o dia da tarefa.`);
  if(candidates.length>1)return state('ambiguous',`Encontrei ${candidates.length} itens chamados ${intent.title}. Qual você quer renomear?`);
  const target=candidates[0]!;
  if(target.kind!=='task'||target.schedule.type!=='task'||target.seriesId||target.occurrenceKey)return state('unsupported','Posso renomear uma tarefa simples por vez. Para este item, use sua agenda.');
  if(target.title===intent.patch.title)return state('unchanged',`Essa tarefa já se chama “${target.title}”.`);
  return {text:'Preparando a alteração…',task:updateDescriptorSchema.parse({id:target.id,title:target.title,dueDate:target.schedule.dueDate,timeZone:read.timeZone,revision:target.revision,patch:intent.patch})};
}
