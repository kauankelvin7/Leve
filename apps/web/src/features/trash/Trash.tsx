import { useEffect, useState } from 'react';
import type { Activity, Category, Note, ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import { sendCommand } from '../../platform/api';
import { useUserCollection, useUserSubcollections } from '../content/useUserCollection';

type TrashItem = { id: string; title?: string; name?: string; revision: number; deletedAt: string | null; purgeAfter?: string | null; command: string; listId?: string };
export function Trash() {
  const activities = useUserCollection<Activity>('activities'); const notes = useUserCollection<Note>('notes'); const lists = useUserCollection<ShoppingList>('shoppingLists'); const categories = useUserCollection<Category>('categories');
  const shoppingItems = useUserSubcollections<ShoppingItem>('shoppingLists', lists.items.map(item => item.id), 'items');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); useEffect(() => { document.title = 'Lixeira · Leve'; }, []);
  const items: TrashItem[] = [
    ...activities.items.map(item => ({ ...item, command: 'activity.restore' })), ...notes.items.map(item => ({ ...item, command: 'note.restore' })),
    ...lists.items.map(item => ({ ...item, command: 'shoppingList.restore' })), ...categories.items.map(item => ({ ...item, title: item.name, command: 'category.restore' })),
    ...shoppingItems.items.map(item => ({ ...item, command: 'shoppingItem.restore', title: item.name, listId: item.parentId })),
  ].filter(item => Boolean(item.deletedAt));
  async function restore(item: TrashItem) { setBusy(true); setMessage(''); try { await sendCommand({ command: item.command, operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }); setMessage('Item restaurado.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível restaurar.'); } finally { setBusy(false); } }
  async function purge(item: TrashItem) { if (!window.confirm('Excluir este item permanentemente? Esta ação não pode ser desfeita.')) return; setBusy(true); setMessage(''); try { await sendCommand({ command: item.command.replace('.restore', '.purge'), operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }); setMessage('Item excluído permanentemente.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível excluir.'); } finally { setBusy(false); } }
  return <main><header className="page-heading"><p className="eyebrow">Retenção de 30 dias</p><h1 id="page-title" tabIndex={-1}>Lixeira</h1></header>{items.length ? <ul className="trash-list">{items.map(item => <li key={`${item.command}-${item.listId ?? 'root'}-${item.id}`}><span><strong>{item.title ?? item.name ?? 'Item sem título'}</strong><small>Disponível até {item.purgeAfter?.slice(0, 10) ?? 'prazo indisponível'}</small></span><div className="row-actions"><button disabled={busy} onClick={() => void restore(item)}>Restaurar</button><button className="danger" disabled={busy} onClick={() => void purge(item)}>Excluir definitivamente</button></div></li>)}</ul> : <div className="empty"><p>A lixeira está vazia.</p></div>}<p role="status">{activities.error || notes.error || lists.error || categories.error || shoppingItems.error || message}</p></main>;
}
