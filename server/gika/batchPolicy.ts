import { batchCallSchema, batchPlanSchema, batchOperationId, type BatchPlan } from '../../packages/domain/src/gikaBatch.ts';
import type { GikaRequest, ReadResult } from '../../packages/domain/src/gika.ts';
import type { ReadRepository } from './reads.ts';
import { scheduleInstants } from '../../packages/domain/src/content.ts';
import { Temporal } from '@js-temporal/polyfill';
import { resolveCreationIntent } from './createPolicy.ts';
import { GikaFault, type ModelContext } from './model.ts';

export type BatchIntent = { operation: 'complete' | 'reschedule'; date: string; title?: string; excludeTitles?: string[]; recurrenceScope?: 'occurrence' | 'future' | 'all'; patch?: {dueDate:string;dueTime?:string} };
const key = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
const day = '(?:hoje|amanh[aã]|depois de amanh[aã]|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo|\\d{4}-\\d{2}-\\d{2}|\\d{2}/\\d{2}/\\d{4})';
const clarify = { clarification: 'Informe o dia das tarefas e o que você quer fazer. Posso alterar até 5 tarefas por vez.' };
export function resolveBatchIntent(text: string, context: ModelContext): BatchIntent | { clarification: string } {
  let source = text.trim().replace(/[.!]$/u, '');
  let recurrenceScope: BatchIntent['recurrenceScope'];
  const scope = source.match(/,?\s+(s[oó] estas ocorr[eê]ncias|somente estas ocorr[eê]ncias|apenas estas ocorr[eê]ncias|daqui para frente|daqui pra frente|todas as pr[oó]ximas|toda a s[eé]rie)$/iu);
  if (scope) { recurrenceScope = /pr[oó]ximas|frente/iu.test(scope[1]!) ? 'future' : /s[eé]rie/iu.test(scope[1]!) ? 'all' : 'occurrence'; source = source.slice(0, scope.index).trim(); }
  const excluded = source.match(/\s+exceto\s+"([^"\n]{1,120})"$/iu);
  const excludeTitles = excluded ? [excluded[1]!] : undefined;
  if (excluded) source = source.slice(0, excluded.index).trim();
  const match = source.match(new RegExp(`^(?:por favor[, ]+)?(conclui|conclua|concluir|complete|marca|marque|move|mova|mover|joga|jogue|passa|passe)\\s+(?:todas\\s+)?(?:as\\s+)?(?:tarefas|pend[eê]ncias)(?:\\s+(?:pendentes))?(?:\\s+chamadas\\s+"([^"\\n]{1,120})")?\\s+(?:de|do dia|para o dia)\\s+(${day})(?:\\s+(?:para|pra)\\s+(${day})(?:\\s+[aà]s\\s+(\\d{1,2}(?::[0-5]\\d|h(?:[0-5]\\d)?)?))?)?(?:\\s+como conclu[ií]das)?$`, 'iu'));
  if (!match) return clarify;
  const operation = /^(?:move|mova|mover|joga|jogue|passa|passe)$/iu.test(match[1]!) ? 'reschedule' : 'complete';
  if ((operation === 'reschedule') !== Boolean(match[4])) return clarify;
  const sourceDate = resolveCreationIntent(`Adiciona Seletor ${match[3]}`, context);
  if (!sourceDate.task?.dueDate || sourceDate.task.title !== 'Seletor') return clarify;
  if (Math.abs(Temporal.PlainDate.from(context.today).until(sourceDate.task.dueDate).days) > 366) return clarify;
  let patch: BatchIntent['patch'];
  if (operation === 'reschedule') {
    const destination = resolveCreationIntent(`Adiciona Seletor ${match[4]}${match[5] ? ` às ${match[5]}` : ''}`, context);
    if (!destination.task?.dueDate || destination.task.title !== 'Seletor' || Math.abs(Temporal.PlainDate.from(context.today).until(destination.task.dueDate).days) > 366) return clarify;
    patch = { dueDate: destination.task.dueDate, ...(destination.task.dueTime !== null ? { dueTime: destination.task.dueTime } : {}) };
  }
  return { operation, date: sourceDate.task.dueDate, ...(match[2] ? { title: match[2] } : {}), ...(excludeTitles ? { excludeTitles } : {}), ...(recurrenceScope ? { recurrenceScope } : {}), ...(patch ? { patch } : {}) };
}
export function validateBatch(args: unknown, text: string, context: ModelContext, operation: BatchIntent['operation']) {
  const parsed = batchCallSchema.parse({name:operation === 'complete' ? 'batch_complete' : 'batch_reschedule',args});
  const call = {date:parsed.args.sourceDate,title:parsed.args.title,excludeTitles:parsed.args.excludeTitles,recurrenceScope:parsed.args.scope ?? undefined,patch:parsed.name === 'batch_reschedule' ? {dueDate:parsed.args.dueDate,...(parsed.args.dueTime !== null ? {dueTime:parsed.args.dueTime}: {})}:undefined}, intent = resolveBatchIntent(text, context);
  if ('clarification' in intent) return intent;
  if (operation !== intent.operation || call.date !== intent.date || key(call.title ?? '') !== key(intent.title ?? '') || JSON.stringify((call.excludeTitles ?? []).map(key)) !== JSON.stringify((intent.excludeTitles ?? []).map(key)) || call.recurrenceScope !== intent.recurrenceScope || JSON.stringify(call.patch) !== JSON.stringify(intent.patch)) throw new GikaFault('GIKA_POLICY');
  return intent;
}

export async function resolveBatch(intent: BatchIntent, read: ReadResult, repository: ReadRepository, uid: string, input: GikaRequest): Promise<{plan: BatchPlan} | {clarification:string}> {
  if (read.startDate !== intent.date || read.endDate !== intent.date) throw new GikaFault('GIKA_INVALID_RESPONSE');
  if (read.partial || read.items.length >= 50) return {clarification:'Esta consulta está incompleta. Confira sua agenda antes de alterar as tarefas.'};
  if (intent.recurrenceScope === 'future' || intent.recurrenceScope === 'all') return {clarification:'Não posso alterar próximas ocorrências ou séries em lote. Peça uma rotina por vez.'};
  const selected = read.items.filter(item => item.kind === 'task' && item.status === 'pending' && (!intent.title || key(item.title) === key(intent.title)) && !(intent.excludeTitles ?? []).some(title => key(title) === key(item.title))).sort((a,b)=>a.id.localeCompare(b.id));
  if (!selected.length) return {clarification:'Não encontrei tarefas pendentes com esse pedido nesse dia.'};
  if (selected.length > 5) return {clarification:'Encontrei mais de 5 tarefas. Escolha um conjunto menor antes de continuar.'};
  const items: BatchPlan['items'] = [];
  for (const target of selected) {
    if (target.schedule.type !== 'task' || target.schedule.dueDate !== intent.date) throw new GikaFault('GIKA_POLICY');
    const recurring = Boolean(target.seriesId || target.occurrenceKey);
    if (recurring && intent.recurrenceScope !== 'occurrence') return {clarification:'Há tarefas de uma rotina neste grupo. Quer alterar só estas ocorrências?'};
    const patch = intent.operation === 'complete' ? {status:'completed' as const} : intent.patch!;
    if ('dueDate' in patch) {
      if (target.schedule.dueDate === patch.dueDate && target.schedule.dueTime === (patch.dueTime ?? target.schedule.dueTime)) return {clarification:'Uma das tarefas já está nessa data e horário. Escolha apenas as tarefas que deseja mover.'};
      try { scheduleInstants({...target.schedule,dueDate:patch.dueDate,dueTime:patch.dueTime ?? target.schedule.dueTime}); } catch {return {clarification:'Esse horário não existe ou é ambíguo nesse fuso. Escolha outra data ou horário pela sua agenda.'};}
    }
    const task = {id:target.id,title:target.title,revision:target.revision,dueDate:target.schedule.dueDate,dueTime:target.schedule.dueTime,timeZone:target.schedule.timeZone};
    const recurrence = recurring ? await repository.inspectRecurrence?.(uid,task) : undefined;
    if (recurring && !recurrence) return {clarification:'Não consegui verificar uma das rotinas. Confira sua agenda antes de continuar.'};
    items.push({operationId:await batchOperationId(uid,input.requestId,items.length),id:task.id,title:task.title,revision:task.revision,timeZone:task.timeZone,before:{dueDate:task.dueDate,dueTime:task.dueTime},patch,scope:recurring?'occurrence':'none',...(recurrence ? {recurrence}: {})});
  }
  if(classifyBatchAction({action:intent.operation,count:items.length,complete:!read.partial,recurrenceVerified:items.every(item=>item.scope==='none'||Boolean(item.recurrence)),scope:intent.recurrenceScope})!=='confirm')throw new GikaFault('GIKA_POLICY');
  return {plan:batchPlanSchema.parse({action:intent.operation,sourceDate:intent.date,items})};
}

/** Batch registration is narrow and does not relax the individual bulk-deny policy. */
export function classifyBatchAction(input: {action:string;count:number;complete:boolean;recurrenceVerified:boolean;scope?:string}): 'confirm' | 'deny' {
  return ['complete','reschedule'].includes(input.action) && Number.isInteger(input.count) && input.count>=1 && input.count<=5 && input.complete && input.recurrenceVerified && (!input.scope || input.scope==='occurrence') ? 'confirm':'deny';
}
