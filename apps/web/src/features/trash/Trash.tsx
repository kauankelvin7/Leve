import { useEffect, useRef, useState } from 'react';
import type { Activity, Category, Note, ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import { apiRequest, sendCommand } from '../../platform/api';
import { useUserCollection, useUserSubcollections } from '../content/useUserCollection';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../identity/AuthProvider';
import styles from './Trash.module.css';
import { formatCivilDate } from '../../platform/formatters';

type TrashItem = { id: string; title?: string; name?: string; revision: number; deletedAt: string | null; purgeAfter?: string | null; command: string; listId?: string; seriesId?: string | null; occurrenceKey?: string | null };
const itemKey = (item: TrashItem) => `${item.command}:${item.listId ?? 'root'}:${item.id}`;
export function Trash() {
  const { user } = useAuth();
  const [confirmation, setConfirmation] = useState<TrashItem | 'all' | null>(null);
  const batch = useRef<{ operationId: string; cutoff: string } | null>(null);
  const activities = useUserCollection<Activity>('activities', false, true); const notes = useUserCollection<Note>('notes', false, true); const lists = useUserCollection<ShoppingList>('shoppingLists'); const categories = useUserCollection<Category>('categories', false, true);
  const shoppingItems = useUserSubcollections<ShoppingItem>('shoppingLists', lists.items.map(item => item.id), 'items', true);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [hiddenCutoff, setHiddenCutoff] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); useEffect(() => { document.title = 'Lixeira · Leve'; }, []);
  const items: TrashItem[] = [
    ...activities.items.map(item => ({ ...item, command: 'activity.restore' })), ...notes.items.map(item => ({ ...item, command: 'note.restore' })),
    ...lists.items.map(item => ({ ...item, command: 'shoppingList.restore' })), ...categories.items.map(item => ({ ...item, title: item.name, command: 'category.restore' })),
    ...shoppingItems.items.map(item => ({ ...item, command: 'shoppingItem.restore', title: item.name, listId: item.parentId })),
  ].filter(item => Boolean(item.deletedAt));
  useEffect(() => {
    if (busy) return;
    setHiddenItems(current => {
      const next = new Set([...current].filter(key => items.some(item => itemKey(item) === key)));
      return next.size === current.size ? current : next;
    });
    if (hiddenCutoff && !items.some(item => item.deletedAt && item.deletedAt <= hiddenCutoff)) setHiddenCutoff(null);
  }, [busy, items, hiddenCutoff]);
  const grouped = new Map<string, TrashItem[]>();
  for (const item of items.filter(item => !hiddenItems.has(itemKey(item)) && !(hiddenCutoff && item.deletedAt && item.deletedAt <= hiddenCutoff))) {
    const key = item.command === 'activity.restore' && item.seriesId ? `series:${item.seriesId}` : `${item.command}:${item.listId ?? 'root'}:${item.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const groups = [...grouped.entries()];
  async function restore(item: TrashItem) { setBusy(true); setMessage(''); try { await sendCommand({ command: item.command, operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }); setMessage('Item restaurado.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível restaurar.'); } finally { setBusy(false); } }
  async function purgeConfirmed() {
    if (busy || !confirmation || !user) return;
    const selected = confirmation;
    setBusy(true); setMessage('Excluindo…'); setConfirmation(null);
    if (selected === 'all') { batch.current ??= { operationId: crypto.randomUUID(), cutoff: new Date().toISOString() }; setHiddenCutoff(batch.current.cutoff); }
    else setHiddenItems(current => new Set([...current, itemKey(selected)]));
    try {
      if (selected === 'all') {
        batch.current ??= { operationId: crypto.randomUUID(), cutoff: new Date().toISOString() };
        let more = true; let removed = 0;
        while (more) {
          const result = await apiRequest<{ removed: number; more: boolean }>('/commands', { method: 'POST', body: JSON.stringify({ command: 'trash.empty', entityId: user.uid, operationId: batch.current.operationId, payload: { cutoff: batch.current.cutoff } }) });
          removed += result.removed; more = result.more; setMessage(removed + ' itens excluídos…');
        }
        batch.current = null; setMessage('Lixeira esvaziada.');
      } else {
        const item = selected;
        await sendCommand({ command: item.command.replace('.restore', '.purge'), operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }, { queueOnNetworkError: false });
        setMessage('Item excluído permanentemente.');
      }
      setConfirmation(null);
    } catch (failure) {
      if (selected === 'all') setHiddenCutoff(null);
      else setHiddenItems(current => { const next = new Set(current); next.delete(itemKey(selected)); return next; });
      setMessage('A exclusão não terminou. ' + (failure instanceof Error ? failure.message : 'Tente novamente.')); }
    finally { setBusy(false); }
  }
  const loading = activities.loading || notes.loading || lists.loading || categories.loading || shoppingItems.loading;
  const error = activities.error || notes.error || lists.error || categories.error || shoppingItems.error;
  function renderItem(item: TrashItem, groupedOccurrence = false) {
    const title = groupedOccurrence && item.occurrenceKey ? formatCivilDate(item.occurrenceKey) : item.title ?? item.name ?? 'Item sem título';
    return <li key={`${item.command}-${item.listId ?? 'root'}-${item.id}`}>
      <span className={styles.itemCopy}><strong title={title}>{title}</strong><small><span className={styles.itemState}>Removido</span> Disponível até {item.purgeAfter ? formatCivilDate(item.purgeAfter.slice(0, 10)) : 'prazo indisponível'}</small></span>
      <div className={`row-actions ${styles.rowActions}`}>
        <button aria-label={`Restaurar ${title}`} title="Restaurar" disabled={busy} onClick={() => void restore(item)}><Icon name="restore" /><span>Restaurar</span></button>
        <button className="danger" aria-label={`Excluir definitivamente ${title}`} title="Excluir definitivamente" disabled={busy} onClick={() => setConfirmation(item)}><Icon name="trash" /><span>Excluir</span></button>
      </div>
    </li>;
  }
  return <main className={styles.page}>
    <header className={`page-heading ${styles.heading}`}><div><p className="eyebrow">Itens guardados por 30 dias</p><h1 id="page-title" tabIndex={-1}>Lixeira</h1></div><div className={styles.headingActions}><span className={styles.count} aria-live="polite">{loading ? 'Carregando…' : `${groups.length} ${groups.length === 1 ? 'item na lixeira' : 'itens na lixeira'}`}</span><button className="text-button danger" disabled={busy || loading || Boolean(error) || !groups.length} onClick={() => setConfirmation('all')}><Icon name="trash" />Excluir tudo</button></div></header>
    {groups.length ? <ul className={`trash-list ${styles.list}`}>
      {groups.map(([key, members]) => members.length === 1 ? renderItem(members[0]!) : <li key={key} className={styles.seriesGroup}>
        <details>
          <summary><span className={styles.itemCopy}><strong>{members[0]!.title ?? 'Atividade repetida'}</strong><small>Série · {members.length} ocorrências removidas</small></span><span className={styles.expandLabel}>Ver ocorrências <Icon name="chevronDown" /></span></summary>
          <p className={styles.groupHint}>Você pode restaurar ou excluir cada ocorrência. Restaurar uma ocorrência não reinicia a repetição.</p>
          <ul className={styles.occurrences}>{[...members].sort((left, right) => (left.occurrenceKey ?? '').localeCompare(right.occurrenceKey ?? '')).map(item => renderItem(item, true))}</ul>
        </details>
      </li>)}
    </ul> : busy ? <p role="status">Excluindo…</p> : loading ? <p role="status">Carregando a lixeira…</p> : !error && <div className={`empty ${styles.emptyState}`}><p>A lixeira está vazia.</p><small>Exclusão automática após 30 dias.</small></div>}
    {activities.items.length >= 50 && <p className={styles.groupHint}>Mostrando até 50 atividades removidas. Ao restaurar ou excluir ocorrências, outras atividades podem aparecer.</p>}
    <p role="status" className="form-status">{error || message}</p>
    {confirmation && <ConfirmDialog title={confirmation === 'all' ? 'Excluir tudo da lixeira' : 'Excluir este item'} onClose={() => { if (!busy) setConfirmation(null); }}><p>{confirmation === 'all' ? 'Todos os itens serão apagados e não poderão ser recuperados. As listas também perderão seus itens.' : 'Este item será apagado e não poderá ser recuperado.'}</p><div className="dialog-actions"><button disabled={busy} onClick={() => setConfirmation(null)}>Manter na lixeira</button><button className="danger" disabled={busy} onClick={() => void purgeConfirmed()}>{busy ? 'Excluindo…' : 'Excluir definitivamente'}</button></div>{message && <p role="status">{message}</p>}</ConfirmDialog>}
  </main>;
}
