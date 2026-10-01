import { Temporal } from '@js-temporal/polyfill';
import { civilDateSchema } from '../../packages/domain/src/content.ts';
import { createTaskArgsSchema, createTaskDescriptorSchema, toolCallSchema, type CreateTaskDescriptor, type ToolCall } from '../../packages/domain/src/gika.ts';
import { GikaFault, type ModelCall, type ModelContext } from './model.ts';
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
const prefix = /^(?:por favor[, ]+)?(?:pode\s+)?(?:adiciona(?:r)?|adicione|cria(?:r)?|crie)(?:\s+(?:uma\s+)?tarefa)?(?:\s+para)?(?:\s+|$)/i;
const datePattern = /\b(depois de amanha|amanha|hoje|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g;
const weekdays: Record<string, number> = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, domingo: 7 };
export type CreationIntent = { task: CreateTaskDescriptor; clarification?: never } | { task?: never; clarification: string };
export function resolveCreationIntent(text: string, context: ModelContext): CreationIntent {
  const source = text.trim().replace(/\s+/g, ' '); const plain = normalized(source);
  const verb = plain.match(prefix);
  const dates = [...plain.matchAll(datePattern)];
  if ((!verb && (/\?/.test(plain) || /\b(o que|quais|consultar|mostra|mostrar|ver minha|ver meu|pendencias)\b/.test(plain) || /^(?:tenho|existe|preciso|ver)\b/.test(plain)))
    || /^(?:nao|conclu|complete|edit|move|mova|reagend|exclu|apag|remov)/.test(plain)
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
export function validateToolCalls(calls: ModelCall[]): ToolCall[] {
  if (calls.length > 3) throw new GikaFault('GIKA_POLICY');
  const tools = calls.map(call => {
    const parsed = toolCallSchema.safeParse(call);
    if (!parsed.success) throw new GikaFault('GIKA_MALFORMED_CALL');
    return parsed.data;
  });
  if (tools.some(tool => tool.name === 'create_task') && tools.length !== 1) throw new GikaFault('GIKA_POLICY');
  return tools;
}
export function validateCreation(args: unknown, text: string, context: ModelContext): CreationIntent {
  const parsed = createTaskArgsSchema.parse(args); const intent = resolveCreationIntent(text, context);
  if (!intent.task) return intent;
  if (normalized(parsed.title) !== normalized(intent.task.title) || parsed.dueDate !== intent.task.dueDate || parsed.dueTime !== intent.task.dueTime) throw new GikaFault('GIKA_POLICY');
  return intent;
}
