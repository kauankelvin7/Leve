import type { z } from 'zod';
import { isRegisteredMutation } from './actionPolicy.ts';
import { assessInvalidTool, assessMultipleActions } from './policyAssessment.ts';
import { Temporal } from '@js-temporal/polyfill';
import { civilDateSchema } from '../../packages/domain/src/content.ts';
import { gikaCurrentActionSchema, createTaskArgsSchema, createTaskDescriptorSchema, toolCallSchema, type CreateTaskDescriptor, type ToolCall } from '../../packages/domain/src/gika.ts';
import { GikaFault, type ModelCall, type ModelContext } from './model.ts';
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
const prefix = /^(?:por favor[, ]+)?(?:pode\s+)?(?:adiciona(?:r)?|adicione|cria(?:r)?|crie)(?:\s+(?:(?:uma|a)\s+)?tarefa)?(?:\s+para)?(?:\s+|$)/i;
const datePattern = /\b(depois de amanha|amanha|hoje|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g;
const weekdays: Record<string, number> = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, domingo: 7 };
export type CreationIntent = { task: CreateTaskDescriptor; clarification?: never } | { task?: never; clarification: string };
export function resolveCreationIntent(text: string, context: ModelContext): CreationIntent {
  const source = text.trim().replace(/\s+/g, ' '); const plain = normalized(source);
  const verb = plain.match(prefix);
  if (!verb) return { clarification: 'O que você gostaria de fazer? Pode conversar comigo ou fazer um pedido sobre sua agenda.' };
  const dates = [...plain.matchAll(datePattern)];
  if ((!verb && (/\?/.test(plain) || /\b(o que|quais|consultar|mostra|mostrar|ver minha|ver meu|pendencias)\b/.test(plain) || /^(?:tenho|existe|preciso|ver)\b/.test(plain)))
    || (!verb && /\b(?:terminei|conclui|conclua|concluir|marca|marque|complete|renomeia|renomeie|renomear|muda|mude|altera|altere|move|mova|mover|joga|jogue|passa|passe|reagenda|reagende)\b/.test(plain))
    || /^(?:nao|terminei|marca|marque|conclu|complete|edit|move|mova|reagend|exclu|apag|remov)/.test(plain)
    || /\b(?:diariamente|semanalmente|recorrente|repetir|todo dia|toda semana|todos os dias|todo[sa]? (?:segunda|terca|quarta|quinta|sexta|sabado|domingo|mes)|duas tarefas|dois itens|\d+ tarefas)\b/.test(plain)
    || /\be (?:adiciona|adicione|cria|crie)\b/.test(plain)) return { clarification: 'Posso adicionar uma tarefa simples por vez. Qual tarefa e data você quer usar?' };
  if (dates.length > 1 || /\b(proxima|que vem)\b/.test(plain)) return { clarification: 'Para qual data você quer adicionar essa tarefa?' };
  const time = [...plain.matchAll(/\bas\s+(\d{1,2})(?::([0-5]\d)|h(?:([0-5]\d))?)?\b/g)];
  if (time.length > 1) return { clarification: 'Qual horário você quer usar para essa tarefa?' };
  let remaining = source;
  // Remove known spans in reverse order; indexes retain the user's original accents/case.
  const spans = [...dates.map(match => ({ index: match.index!, length: match[0].length })), ...time.map(match => ({ index: match.index!, length: match[0].length }))].sort((a, b) => b.index - a.index);
  for (const span of spans) remaining = remaining.slice(0, span.index) + remaining.slice(span.index + span.length);
  if (verb) remaining = remaining.slice(verb[0].length);
  remaining = remaining.replace(/\b(?:sem data|para o dia|no dia)\b/gi, '').replace(/\s+/g, ' ').replace(/^[\s,.;!?]+|[\s,.;!?]+$/g, '');
  if (dates.length) remaining = remaining.replace(/\s+(?:em|para|no|na)$/i, '').trim();
  remaining = remaining.replace(/^"(.*)"$/, '$1').trim();
  if (!remaining || /^(?:uma )?tarefa$/.test(normalized(remaining))) return { clarification: 'Qual tarefa você quer adicionar?' };
  if (!verb && !dates.length) return { clarification: 'Para qual dia você quer adicionar essa tarefa?' };
  let date: string | null = null;
  if (dates.length) {
    const expression = dates[0]![0]; const today = Temporal.PlainDate.from(context.today);
    if (expression === 'hoje') date = context.today;
    else if (expression === 'amanha' || expression === 'depois de amanha') date = today.add({ days: expression === 'amanha' ? 1 : 2 }).toString();
    else if (expression.includes('/')) date = expression.split('/').reverse().join('-');
    else if (weekdays[expression.replace('-feira', '')]) date = today.add({ days: (weekdays[expression.replace('-feira', '')]! - today.dayOfWeek + 7) % 7 }).toString();
    else date = expression;
    if (!civilDateSchema.safeParse(date).success) return { clarification: 'Qual data você quer usar? Informe dia, mês e ano.' };
  }
  if (time.length && !date) return { clarification: 'Para qual dia você quer adicionar essa tarefa?' };
  const dueTime = time.length ? `${time[0]![1]!.padStart(2, '0')}:${time[0]![2] ?? time[0]![3] ?? '00'}` : null;
  const task = createTaskDescriptorSchema.safeParse({ title: remaining, dueDate: date, dueTime, timeZone: context.timeZone });
  return task.success ? { task: task.data } : { clarification: 'Confira o título, a data e o horário da tarefa.' };
}
/** A semantic proposal is not an effect: ground every fragment in this request,
 * derive civil fields in software, then run the existing action validator. */
export function normalizeCurrentAction(action: z.infer<typeof gikaCurrentActionSchema>, text: string, context: ModelContext): string | null {
  const parsed = gikaCurrentActionSchema.safeParse(action);
  if (!parsed.success || parsed.data.sourceText !== text.trim()) return null;
  const { requestExpression, title, dateExpression, timeExpression, kind } = parsed.data;
  const source = text.trim();
  if (!source.startsWith(requestExpression) || /\b(?:nao|talvez|se)\b/.test(normalized(requestExpression))) return null;
  const request = normalized(requestExpression);
  // Preserve the existing refusal of destructive/other operations; semantic
  // normalization must not turn their literal directives into create/move.
  if (/\b(?:exclu\w*|apag\w*|remov\w*|delet\w*|purg\w*|cancel\w*|reabr\w*|desfa\w*|lembre\w*|conclu\w*|complete|terminei|renome\w*)\b/.test(request)) return null;
  if (/\b(?:recorrente|diariamente|semanalmente|serie|series|todos|todas|toda|todo|duas|dois|lote)\b/.test(request)) return null;
  if (kind === 'create_task' && /\b(?:move|mova|mover|reagenda|reagende|muda|mude)\b/.test(request)) return null;
  if (kind === 'reschedule_task' && /\b(?:adiciona\w*|cria\w*|crie)\b/.test(request)) return null;
  const ranges: {index:number;length:number}[] = [];
  for (const fragment of [requestExpression, title, dateExpression, timeExpression].filter((value): value is string => value !== null)) {
    const index = source.indexOf(fragment);
    if (index < 0 || source.indexOf(fragment, index + fragment.length) >= 0 || ranges.some(range => index < range.index + range.length && index + fragment.length > range.index)) return null;
    ranges.push({index,length:fragment.length});
  }
  let residue = source;
  for (const range of ranges.sort((a,b)=>b.index-a.index)) residue = residue.slice(0,range.index)+' '+residue.slice(range.index+range.length);
  // Connectors only; unrepresented instructions/intervals/recurrence cannot disappear.
  if (normalized(residue).replace(/\b(?:para|pra|no|na|em|as|a|o|dia)\b/g,'').replace(/[\s,.;!?"'“”‘’]/g,'')) return null;
  if (!dateExpression && !timeExpression) return null;
  if (dateExpression) {
    const temporal = resolveCreationIntent(`Adiciona Referência temporal ${dateExpression}`,context);
    if (!temporal.task || temporal.task.title !== 'Referência temporal' || !temporal.task.dueDate || temporal.task.dueTime !== null) return null;
  }
  let time: string | null = null;
  if (timeExpression) {
    const match = normalized(timeExpression).match(/^(?:as\s+)?(\d{1,2})(?::([0-5]\d)|h(?:([0-5]\d))?)?(?:\s+horas?)?(?:\s+(?:da|de)\s+(manha|tarde|noite))?$/);
    if (!match) return null;
    let hour = Number(match[1]);
    if (match[4]) {
      if (hour < 1 || hour >= 12 || (match[4] === 'noite' && hour < 6)) return null;
      hour = hour % 12 + (match[4] === 'manha' ? 0 : 12);
    }
    if (hour > 23) return null;
    time = `${String(hour).padStart(2,'0')}:${match[2] ?? match[3] ?? '00'}`;
  }
  if (kind === 'create_task') {
    if (!dateExpression) return null;
    return `Adiciona "${title}" ${dateExpression}${time ? ` às ${time}` : ''}`;
  }
  return `Move "${title}" para ${dateExpression ?? ''}${time ? ` às ${time}` : ''}`.replace(/\s+/g,' ').trim();
}
export function isCreationRequest(text: string) { return prefix.test(normalized(text)); }
export function validateToolCalls(calls: ModelCall[]): ToolCall[] {
  if (calls.length > 3) throw new GikaFault('GIKA_POLICY');
  const tools = calls.map(call => {
    const parsed = toolCallSchema.safeParse(call);
    if (!parsed.success) {
      assessInvalidTool(typeof call?.name === 'string' ? call.name : 'unknown');
      throw new GikaFault('GIKA_MALFORMED_CALL');
    }
    return parsed.data;
  });
  if (tools.some(tool => tool.name === 'respond_conversation') && tools.length !== 1) throw new GikaFault('GIKA_POLICY');
  if (tools.some(tool => tool.name === 'create_task' || tool.name === 'complete_task' || tool.name === 'update_task' || tool.name === 'reschedule_task' || tool.name === 'batch_complete' || tool.name === 'batch_reschedule' || tool.name === 'propose_organization') && tools.length !== 1) {
    const first = tools[0];
    // Schemas above normalize property order and reject unknown fields before collapsing repetition.
    if ((first?.name !== 'create_task' && first?.name !== 'complete_task' && first?.name !== 'update_task' && first?.name !== 'reschedule_task' && first?.name !== 'batch_complete' && first?.name !== 'batch_reschedule' && first?.name !== 'propose_organization') || tools.some(tool => JSON.stringify(tool) !== JSON.stringify(first))) {
      const mutation = tools.find(tool => isRegisteredMutation(tool.name));
      if (mutation && isRegisteredMutation(mutation.name)) assessMultipleActions(mutation.name, 'verified');
      throw new GikaFault('GIKA_POLICY');
    }
    return [first];
  }
  return tools;
}
export function validateCreation(args: unknown, text: string, context: ModelContext): CreationIntent {
  const parsed = createTaskArgsSchema.parse(args); const intent = resolveCreationIntent(text, context);
  if (!intent.task) return intent;
  if (normalized(parsed.title) !== normalized(intent.task.title) || parsed.dueDate !== intent.task.dueDate || parsed.dueTime !== intent.task.dueTime) throw new GikaFault('GIKA_POLICY');
  return intent;
}
