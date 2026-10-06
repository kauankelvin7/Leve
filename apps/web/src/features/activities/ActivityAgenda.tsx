import type { Activity, Category } from '../../../../../packages/domain/src/content';
import { LoadError } from '../../components/ui/LoadError';
import { LoadingState } from '../../components/ui/LoadingState';
import { TodayActivityRow, type StoredActivity } from './TodayActivityRow';
import { Icon } from '../../components/ui/Icon';
import styles from './Today.module.css';

type ActivityAgendaProps = {
  activities: StoredActivity[];
  tasks: StoredActivity[];
  events: StoredActivity[];
  categories: Category[];
  filterCategories: Category[];
  taskCount: number;
  completedTaskCount: number;
  statusFilter: string;
  categoryFilter: string;
  message: string;
  messageTone: 'success' | 'error' | 'info';
  composerOpen: boolean;
  busy: boolean;
  loading: boolean;
  error: string;
  partial: boolean;
  cached: boolean;
  retry: () => void;
  onStatusFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onCreate: () => void;
  onChangeStatus: (activity: StoredActivity, next: Activity['status']) => void;
  onEdit: (activity: StoredActivity) => void;
  onTrash: (activity: StoredActivity) => void;
  onTrashSeries: (activity: StoredActivity) => void;
};

export function ActivityAgenda({
  activities, tasks, events, categories, filterCategories, taskCount, completedTaskCount,
  statusFilter, categoryFilter, message, messageTone, composerOpen, busy,
  loading, error, partial, cached, retry, onStatusFilterChange,
  onCategoryFilterChange, onCreate, onChangeStatus, onEdit, onTrash, onTrashSeries,
}: ActivityAgendaProps) {
  const activityRow = (activity: StoredActivity) => <TodayActivityRow
    key={activity.id}
    activity={activity}
    categories={categories}
    busy={busy}
    onChangeStatus={onChangeStatus}
    onEdit={onEdit}
    onTrash={onTrash}
    onTrashSeries={onTrashSeries}
  />;

  const activeFilters = Number(statusFilter !== 'all') + Number(categoryFilter !== 'all');
  return <section className={`real-activities ${styles.activities}`} aria-labelledby="activity-title">
    <div className="section-heading daily-checklist-heading">
      <h2 id="activity-title">Tarefas do dia</h2>
      <span className="muted">{taskCount ? `${completedTaskCount} de ${taskCount} concluídas` : 'Nenhuma tarefa'}</span>
    </div>

    {taskCount > 0 ? <div className="checklist-progress-row" aria-label={`Progresso do checklist: ${completedTaskCount} de ${taskCount} tarefas concluídas`}>
      <progress className="checklist-progress" max={Math.max(taskCount, 1)} value={completedTaskCount} />
      <strong>{Math.round((completedTaskCount / taskCount) * 100)}%</strong>
    </div> : null}

    <details className={styles.filters}>
      <summary><Icon name="filter" /><span>Filtrar atividades</span>{activeFilters > 0 && <span className="count-badge">{activeFilters} {activeFilters === 1 ? 'filtro ativo' : 'filtros ativos'}</span>}<Icon name="chevronDown" /></summary>
      <div className="activity-filters" aria-label="Filtros de atividades">
        <label>Estado<select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)}><option value="all">Todos</option><option value="pending">Pendentes</option><option value="completed">Concluídas</option><option value="canceled">Canceladas</option></select></label>
        <label>Categoria<select value={categoryFilter} onChange={event => onCategoryFilterChange(event.target.value)}><option value="all">Todas</option><option value="none">Sem categoria</option>{filterCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      </div>
    </details>

    {!composerOpen && message ? <p role={messageTone === 'error' ? 'alert' : 'status'} className={`form-status activity-form-status ${messageTone}`} aria-live="polite">{message}</p> : null}
    {error ? <LoadError message={error} retry={retry} /> : null}
    {partial ? <p role="status">Mostrando parte das atividades.</p> : null}
    {cached && activities.length > 0 ? <p className="muted" role="status">Sem conexão. Mostrando dados salvos.</p> : null}

    {loading ? <LoadingState label="Carregando seu dia…" /> : <>
      {tasks.length ? <ul className="activity-list checklist-list">{tasks.map(activityRow)}</ul> : !error ? <div className="empty checklist-empty">
        <p>{activities.some(activity => activity.kind === 'task') ? 'Nenhuma tarefa com estes filtros.' : 'Nenhuma tarefa neste dia.'}</p>
        <button className="text-link" onClick={onCreate}>Adicionar tarefa</button>
      </div> : null}

      {events.length ? <section className="day-events" aria-labelledby="events-title">
        <div className="section-heading"><div><h3 id="events-title">Compromissos</h3></div><span className="muted">{events.length} {events.length === 1 ? 'compromisso' : 'compromissos'}</span></div>
        <ul className="activity-list event-list">{events.map(activityRow)}</ul>
      </section> : null}
    </>}
  </section>;
}
