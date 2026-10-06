import { Link } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import { Icon } from '../../components/ui/Icon';
import styles from './Today.module.css';

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

  return <section className={styles.overview} aria-label="Resumo do dia selecionado">
    <div className={styles.date}><strong>{date.day}</strong><span>{date.toLocaleString('pt-BR', { month: 'long' })}<small>{date.toLocaleString('pt-BR', { weekday: 'long' })}</small></span></div>
    <div className={styles.summary}><h2>{summary}</h2>{plannedMinutes > 0 ? <p>{plannedMinutes} min planejados.</p> : null}</div>
    <Link className={styles.reviewLink} to="/revisao"><Icon name="clock" /><span>Ver revisão</span></Link>
  </section>;
}
