import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import { Icon } from '../../components/ui/Icon';

type TodayOverviewProps = {
  selectedDay: string;
  today: string;
  loading: boolean;
  pendingTaskCount: number;
  taskCount: number;
  pendingCount: number;
  plannedMinutes: number;
};

export function TodayOverview({
  selectedDay,
  today,
  loading,
  pendingTaskCount,
  taskCount,
  pendingCount,
  plannedMinutes,
}: TodayOverviewProps) {
  const date = Temporal.PlainDate.from(selectedDay);
  const summary = loading
    ? 'Abrindo o dia…'
    : pendingTaskCount
      ? `${pendingTaskCount} ${pendingTaskCount === 1 ? 'tarefa' : 'tarefas'} ${selectedDay === today ? 'para hoje' : 'neste dia'}`
      : taskCount
        ? 'Checklist em dia'
        : pendingCount
          ? `${pendingCount} ${pendingCount === 1 ? 'compromisso' : 'compromissos'} neste dia`
          : 'Nada planejado';

  return <section className="day-overview" aria-label="Resumo do dia selecionado">
    <div className="day-overview-date"><span>{date.toLocaleString('pt-BR', { month: 'long' })}</span><strong>{date.day}</strong><span>{date.toLocaleString('pt-BR', { weekday: 'long' })}</span></div>
    <div className="day-overview-content"><p className="eyebrow">Resumo</p><h2>{summary}</h2>{plannedMinutes > 0 ? <p>{plannedMinutes} min planejados.</p> : null}<nav className="day-shortcuts" aria-label="Acessos rápidos"><Link to="/notas"><Icon name="note" />Notas</Link><Link to="/compras"><Icon name="basket" />Compras</Link><Link to="/revisao"><Icon name="clock" />Tempo registrado</Link></nav></div>
  </section>;
}
