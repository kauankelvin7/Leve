import type { Activity, Category } from '../../../../../packages/domain/src/content';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { formatCivilDate } from '../../platform/formatters';

export type StoredActivity = Activity & { id: string };

type TodayActivityRowProps = {
  activity: StoredActivity;
  categories: Category[];
  busy: boolean;
  onChangeStatus: (activity: StoredActivity, next: Activity['status']) => void;
  onEdit: (activity: StoredActivity) => void;
  onTrash: (activity: StoredActivity) => void;
  onTrashSeries: (activity: StoredActivity) => void;
};

function describe(activity: StoredActivity) {
  if (activity.schedule.type === 'task') {
    if (!activity.schedule.dueDate) return 'Sem data';
    const date = formatCivilDate(activity.schedule.dueDate);
    return activity.schedule.dueTime ? `${date} · ${activity.schedule.dueTime}` : date;
  }
  return activity.schedule.allDay
    ? `${formatCivilDate(activity.schedule.startDate)} · dia inteiro`
    : `${formatCivilDate(activity.schedule.startDate)} · ${activity.schedule.startTime}–${activity.schedule.endTime}`;
}

export function TodayActivityRow({ activity, categories, busy, onChangeStatus, onEdit, onTrash, onTrashSeries }: TodayActivityRowProps) {
  const color = activity.colorHex ?? categories.find(category => category.id === activity.categoryId)?.colorHex ?? '#ddd';
  const categoryName = categories.find(category => category.id === activity.categoryId)?.name ?? 'Sem categoria';
  const isCompleted = activity.status === 'completed';
  const taskTime = activity.schedule.type === 'task' ? activity.schedule.dueTime : null;
  const meta = activity.kind === 'task'
    ? [taskTime, categoryName, activity.estimatedMinutes ? `${activity.estimatedMinutes} min estimados` : null].filter(Boolean).join(' · ')
    : [describe(activity), categoryName, activity.estimatedMinutes ? `${activity.estimatedMinutes} min estimados` : null].filter(Boolean).join(' · ');

  return <li
    className={`day-activity ${activity.kind === 'task' ? 'checklist-item' : 'event-item'}${isCompleted ? ' is-completed' : ''}`}
    style={{ borderLeft: `4px solid ${color}` }}
    aria-label={`${activity.title}${isCompleted ? ', concluída' : ''}`}
  >
    <div className="activity-manage">
      {activity.kind === 'task' ? <label className="activity-main checklist-main">
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={busy}
          onChange={() => onChangeStatus(activity, isCompleted ? 'pending' : 'completed')}
          aria-label={isCompleted ? `Reabrir ${activity.title}` : `Concluir ${activity.title}`}
        />
        <span>
          <strong><Link to={`/atividade/${activity.id}`}>{activity.title}</Link></strong>
          <small>{meta}</small>
          {isCompleted ? <span className="activity-completion-badge"><Icon name="check" />Concluído</span> : null}
        </span>
      </label> : <div className="activity-main event-main">
        <span className="event-marker" aria-hidden="true" />
        <span>
          <strong><Link to={`/atividade/${activity.id}`}>{activity.title}</Link></strong>
          <small>{meta}</small>
          {isCompleted ? <span className="activity-completion-badge"><Icon name="check" />Concluído</span> : null}
        </span>
      </div>}
      <div className="row-actions">
        {activity.kind === 'event' ? <button
          disabled={busy}
          onClick={() => onChangeStatus(activity, activity.status === 'pending' ? 'completed' : 'pending')}
          aria-label={`${activity.status === 'completed' ? 'Reabrir' : activity.status === 'canceled' ? 'Reativar' : 'Concluir'} ${activity.title}`}
        >{activity.status === 'completed' ? 'Reabrir' : activity.status === 'canceled' ? 'Reativar' : 'Concluir'}</button> : null}
        <Link className="button activity-timer-link" to={`/atividade/${activity.id}#cronometro`} aria-label={`Abrir cronômetro de ${activity.title}`}>
          <Icon name="clock" /><span>Cronômetro</span>
        </Link>
        <button disabled={busy} onClick={() => onEdit(activity)} aria-label={`Editar ${activity.title}`}>Editar</button>
        <button disabled={busy} onClick={() => onTrash(activity)} aria-label={`Excluir ${activity.title}`}>Excluir</button>
        {activity.seriesId ? <button disabled={busy} onClick={() => onTrashSeries(activity)} aria-label={`Excluir toda a série de ${activity.title}`}>Excluir série</button> : null}
      </div>
    </div>
  </li>;
}
