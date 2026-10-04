import { Temporal } from '@js-temporal/polyfill';
import { completeTaskArgsSchema, completionDescriptorSchema, type CompletionDescriptor, type CompletionResolution } from '../../packages/domain/src/gikaCompletion.ts';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import { resolveCreationIntent } from './createPolicy.ts';
import { GikaFault, type ModelContext } from './model.ts';
const titleKey = (text: string) => text.trim().toLocaleLowerCase('pt-BR');
export function resolveCompletionIntent(text: string, context: ModelContext): { title: string; date: string } | { clarification: string } {
  const prefix = /^(?:por favor[, ]+)?(?:terminei|conclu[ií]|conclua|complete|marca|marque)(?:\s+(?:(?:a|uma)\s+)?tarefa)?\s+/i;
  const match = text.trim().match(prefix);
  if (!match || /\b(?:todas|todos|duas tarefas|dois itens|\d+ tarefas|recorrente|toda semana)\b/i.test(text) || /\be\s+(?:conclu|marca|complete|adiciona|cria|move)/i.test(text)) return { clarification: 'Qual tarefa você quer concluir? Informe o título e, se necessário, o dia.' };
  let selector = text.trim().slice(match[0].length).replace(/\s+como\s+conclu[ií]d[ao]\b/i, '').trim();
  if (!selector || /^(?:a\s+)?tarefa$/i.test(selector) || /\b(?:sem data|próxima|proxima|que vem)\b/i.test(selector)) return { clarification: 'Qual tarefa você quer concluir? Informe o título e o dia.' };
  const dates = [...selector.matchAll(/(?<![\p{L}\p{N}_])(?:depois de amanhã|depois de amanha|amanhã|amanha|hoje|ontem|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})(?![\p{L}\p{N}_])/giu)];
  if (dates.length > 1 || /\bas\s+\d|\bàs\s+\d/i.test(selector)) return { clarification: 'Qual tarefa e dia você quer usar? Informe uma data e uma tarefa por vez.' };
  let date = context.today;
  if (dates.length) {
    const expression = dates[0]!;
    const civil = expression[0].toLocaleLowerCase('pt-BR') === 'ontem' ? Temporal.PlainDate.from(context.today).subtract({ days: 1 }).toString() : expression[0];
    // Reuse the adopted civil-date parser only for dates. Preserve the actual title's whitespace.
    const parsed = resolveCreationIntent(`Adiciona tarefa de teste ${civil}`, context);
    if (!parsed.task?.dueDate) return { clarification: 'Qual data você quer usar? Informe dia, mês e ano.' };
    date = parsed.task.dueDate;
    selector = (selector.slice(0, expression.index!) + selector.slice(expression.index! + expression[0].length)).trim().replace(/\s+(?:em|para|no|na|de|dia)$/i, '').trim();
  }
  const title = completeTaskArgsSchema.shape.title.safeParse(selector);
  if (!title.success) return { clarification: 'Qual tarefa você quer concluir? Informe o título e o dia.' };
  const distance = Math.abs(Temporal.PlainDate.from(context.today).until(Temporal.PlainDate.from(date)).days);
  if (distance > 366) return { clarification: 'Informe uma data próxima para localizar essa tarefa.' };
  return { title: title.data, date };

}
export function validateCompletion(args: unknown, text: string, context: ModelContext) {
  const call = completeTaskArgsSchema.parse(args);
  const intent = resolveCompletionIntent(text, context);
  if ('clarification' in intent) return intent;
  if (titleKey(call.title) !== titleKey(intent.title) || (call.date ?? context.today) !== intent.date) throw new GikaFault('GIKA_POLICY');
  return intent;
}
export function resolveCompletion(intent: { title: string; date: string }, read: ReadResult, allowRecurring = false): { text: string; task: CompletionDescriptor; resolution?: never } | { text: string; task?: never; resolution: CompletionResolution } {
  if (read.startDate !== intent.date || read.endDate !== intent.date) throw new GikaFault('GIKA_INVALID_RESPONSE');
  const candidates = read.items.filter(item => titleKey(item.title) === titleKey(intent.title));
  const options = candidates.map(item => ({ id: item.id, title: item.title, dueDate: item.schedule.type === 'task' ? item.schedule.dueDate : item.schedule.startDate, status: item.status }));
  function state(status: CompletionResolution['status'], text: string): { text: string; resolution: CompletionResolution } { return { text, resolution: { status, candidates: options } }; }
  if (read.partial) return state('partial', 'Esta consulta está incompleta. Confira sua agenda para concluir a tarefa.');
  if (candidates.length === 0) return state('not_found', `Não encontrei uma tarefa chamada ${intent.title} nesse dia. Informe o título e o dia da tarefa.`);
  if (candidates.length > 1) return state('ambiguous', `Encontrei ${candidates.length} ${candidates.every(item => item.kind === 'task') ? 'tarefas chamadas' : 'itens chamados'} ${intent.title}. Qual você concluiu?`);
  const target = candidates[0]!;
  if (target.kind !== 'task' || target.schedule.type !== 'task' || (!allowRecurring && (target.seriesId || target.occurrenceKey)) || target.status === 'canceled') return state('unsupported', 'Posso concluir uma tarefa simples por vez. Para este item, use sua agenda.');
  if (target.status === 'completed') return state('already_completed', `${target.title} já estava concluída.`);
  const task = completionDescriptorSchema.parse({ id: target.id, title: target.title, dueDate: target.schedule.dueDate, timeZone: read.timeZone, revision: target.revision });
  return { text: 'Preparando a conclusão…', task };
}
