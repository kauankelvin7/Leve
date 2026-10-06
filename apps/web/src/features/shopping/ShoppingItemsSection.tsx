import type { ShoppingItem } from '../../../../../packages/domain/src/content';
import { Icon } from '../../components/ui/Icon';
import { formatDateTimeDate } from '../../platform/formatters';
import styles from './ShoppingItemsSection.module.css';

export type StoredShoppingItem = ShoppingItem & { id: string; purgeAfter?: string | null };

type ShoppingItemsSectionProps = {
  active: StoredShoppingItem[];
  deleted: StoredShoppingItem[];
  pending: StoredShoppingItem[];
  completed: StoredShoppingItem[];
  loading: boolean;
  busy: boolean;
  onToggle: (item: StoredShoppingItem) => void;
  onEdit: (item: StoredShoppingItem) => void;
  onTrash: (item: StoredShoppingItem) => void;
  onRestore: (item: StoredShoppingItem) => void;
};

export function ShoppingItemsSection({ active, deleted, pending, completed, loading, busy, onToggle, onEdit, onTrash, onRestore }: ShoppingItemsSectionProps) {
  const itemRow = (item: StoredShoppingItem) => <div className={`shopping-item ${styles.itemRow}`} key={item.id}>
    <input aria-label={`Marcar ${item.name} como ${item.checked ? 'pendente' : 'concluído'}`} type="checkbox" checked={item.checked} disabled={busy} onChange={() => onToggle(item)} />
    <button className={`shopping-item-content ${styles.itemContent}`} disabled={busy} onClick={() => onEdit(item)}>
      <span className={item.checked ? 'completed' : ''}>{item.name}</span>
      <small>{item.quantityValue ? `${item.quantityValue} ${item.unitLabel || item.unit}` : item.detail || 'Sem detalhes'}</small>
    </button>
    <button className="icon-button danger" aria-label={`Excluir ${item.name}`} title="Excluir item" disabled={busy} onClick={() => onTrash(item)}><Icon name="trash" /></button>
  </div>;

  return <>
    {loading ? <p role="status">Carregando os itens…</p> : <section data-testid="shopping-items-section" className={`panel shopping ${styles.itemsSection}`}>
      <div className="section-heading"><div><p className="eyebrow">Sua lista</p><h2>Para comprar</h2></div><span className="count-badge">{completed.length} de {active.length} concluídos</span></div>
      <progress className="shopping-progress" aria-label="Itens concluídos" max={Math.max(1, active.length)} value={completed.length} />
      {active.length === 0 && <div className={`shopping-empty ${styles.emptyState}`}><span className="empty-icon"><Icon name="basket" /></span><strong>Nenhum item ainda</strong></div>}
      {pending.length ? <div className={`shopping-pending-items ${styles.pendingItems}`}>{pending.map(itemRow)}</div> : null}
      {completed.length ? <details className={`completed-shopping ${styles.completedItems}`}><summary><span>Concluídos</span><small>{completed.length}</small></summary>{completed.map(itemRow)}</details> : null}
    </section>}
    {deleted.length ? <details className={`panel content-form deleted-shopping-items ${styles.deletedItems}`}><summary>Itens removidos ({deleted.length})</summary><ul className="trash-list">{deleted.map(item => <li key={item.id}><span><strong>{item.name}</strong><small>Disponível até {formatDateTimeDate(item.purgeAfter) || 'data não informada'}</small></span><button disabled={busy} onClick={() => onRestore(item)}><Icon name="restore" />Restaurar</button></li>)}</ul></details> : null}
  </>;
}
