import { Temporal } from '@js-temporal/polyfill';
import type { ReadResult } from '../../packages/domain/src/gika.ts';
import type { ModelContext } from './model.ts';

/** Describe only verified reads. No second model call, inferred duration or availability. */
export function readSummary(reads: ReadResult[], context: ModelContext): string {
  if (reads.some(read => read.partial)) return 'Aqui está parte da sua agenda. Confira o calendário para ver o restante.';
  const items = new Map(reads.flatMap(read => read.items.map(item => [item.id, item] as const)));
  const pending = [...items.values()].filter(item => item.status === 'pending').length;
  const completed = [...items.values()].filter(item => item.status === 'completed').length;
  let period = 'nesse período';
  if (reads.length === 1 && reads[0]!.startDate === reads[0]!.endDate) {
    const date = reads[0]!.startDate;
    period = date === context.today ? 'hoje' : date === Temporal.PlainDate.from(context.today).add({ days: 1 }).toString()
      ? 'amanhã' : `em ${date.split('-').reverse().join('/')}`;
  }
  if (!items.size) return `Não encontrei atividades ${period}.`;
  if (!pending) return completed ? `Sem pendências ${period}. ${completed === 1 ? 'Uma atividade já foi concluída' : `${completed} atividades já foram concluídas`}.` : `Aqui estão as atividades ${period}.`;
  return `${period === 'hoje' ? 'Hoje' : period === 'amanhã' ? 'Amanhã' : 'Nesse período'}, ${pending === 1 ? 'há uma atividade pendente' : `há ${pending} atividades pendentes`}${completed ? ` e ${completed} ${completed === 1 ? 'concluída' : 'concluídas'}` : ''}. Confira os detalhes abaixo.`;
}
