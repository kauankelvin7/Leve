import { Temporal } from '@js-temporal/polyfill';
import { useState } from 'react';
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
  const [monthOpen, setMonthOpen] = useState(() => window.matchMedia('(min-width: 1120px)').matches);

  return (
    <aside className={`agenda-aside ${styles.todayAside}`}>
      <details className={`panel today-month-panel ${styles.monthPanel}`} open={monthOpen} onToggle={event => setMonthOpen(event.currentTarget.open)}>
        <summary className={styles.monthToggle}><Icon name="calendar" /><span>Calendário do mês</span><Icon name="chevronDown" /></summary>
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
            <Link className="button" to="/calendario">Abrir calendário</Link>
            <button type="button" onClick={onAddActivity}><Icon name="plus" />Adicionar</button>
          </div>
        </div>
        {partial ? <p className="muted">Mostrando parte das atividades.</p> : null}
      </details>

      {pinnedNote ? <article className={`note ${pinnedNote.paperColorPreset ?? 'butter'} ${styles.pinnedNote}`}>
        <p className="note-kicker">Fixada no Meu dia</p>
        <h2>{pinnedNote.title}</h2>
        <p>{pinnedNote.plainText}</p>
        <Link to="/notas">Abrir notas</Link>
      </article> : <Link className={`panel ${styles.emptyNote}`} to="/notas"><Icon name="note" /><span><strong>Fixar uma nota</strong><small>Deixe uma anotação à mão.</small></span><Icon name="chevronRight" /></Link>}

      <Link className={`panel shopping-summary ${styles.shoppingSummary}`} to="/compras">
        <Icon name="basket" />
        <span><strong>Compras</strong><small>{activeShoppingListCount ? <>{pendingShoppingItems} {pendingShoppingItems === 1 ? 'item pendente' : 'itens pendentes'} em {activeShoppingListCount} {activeShoppingListCount === 1 ? 'lista' : 'listas'}</> : 'Crie sua primeira lista.'}</small></span>
        <Icon name="chevronRight" />
      </Link>
    </aside>
  );
}
