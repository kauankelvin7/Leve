import { Temporal } from '@js-temporal/polyfill';
import { Link } from 'react-router-dom';
import type { Note } from '../../../../../packages/domain/src/content';
import { Icon } from '../../components/ui/Icon';
import { DayNavigation } from './DayNavigation';
import styles from './TodayAside.module.css';

type TodayAsideProps = {
  selectedDay: string;
  today: string;
  weekStartsOn: number;
  onSelectDay: (day: string) => void;
  dotsOf: (date: string) => string[];
  loading: boolean;
  partial: boolean;
  selectedActivityCount: number;
  pinnedNote?: Note;
  pendingShoppingItems: number;
  activeShoppingListCount: number;
  onAddActivity: () => void;
};

export function TodayAside({
  selectedDay,
  today,
  weekStartsOn,
  onSelectDay,
  dotsOf,
  loading,
  partial,
  selectedActivityCount,
  pinnedNote,
  pendingShoppingItems,
  activeShoppingListCount,
  onAddActivity,
}: TodayAsideProps) {
  const selectedDate = Temporal.PlainDate.from(selectedDay);

  return (
    <aside className={`agenda-aside ${styles.todayAside}`}>
      <section className={`panel today-month-panel ${styles.monthPanel}`}>
        <DayNavigation
          month
          selected={selectedDay}
          today={today}
          weekStartsOn={weekStartsOn}
          onSelect={onSelectDay}
          dotsOf={dotsOf}
        />
        <div className={`month-panel-summary ${styles.monthSummary}`} aria-live="polite">
          <div>
            <strong>{selectedDate.toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}</strong>
            <span>{loading ? 'Carregando compromissos…' : `${selectedActivityCount} ${selectedActivityCount === 1 ? 'atividade neste dia' : 'atividades neste dia'}`}</span>
          </div>
          <div className={`month-panel-actions ${styles.monthActions}`}>
            <Link className="button" to="/calendario">Ver calendário completo</Link>
            <button type="button" className="primary" onClick={onAddActivity}><Icon name="plus" />Adicionar</button>
          </div>
        </div>
        {partial ? <p className="muted">Mostrando parte das atividades.</p> : null}
      </section>

      <article className={`note ${pinnedNote?.paperColorPreset ?? 'butter'}`}>
        <p className="note-kicker">Fixada no Meu dia</p>
        <h2>{pinnedNote?.title ?? 'Uma nota para lembrar'}</h2>
        <p>{pinnedNote?.plainText ?? 'Nenhuma nota fixada.'}</p>
        <Link to="/notas">Abrir notas</Link>
      </article>

      <Link className={`panel shopping-summary ${styles.shoppingSummary}`} to="/compras">
        <strong>Compras</strong>
        <span>
          {pendingShoppingItems} {pendingShoppingItems === 1 ? 'item pendente' : 'itens pendentes'}{' '}
          em {activeShoppingListCount} {activeShoppingListCount === 1 ? 'lista' : 'listas'}
        </span>
      </Link>
    </aside>
  );
}
