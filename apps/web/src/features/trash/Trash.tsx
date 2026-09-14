import { useEffect, useRef, useState } from 'react';
import type { Activity, Category, Note, ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import { apiRequest, sendCommand } from '../../platform/api';
import { useUserCollection, useUserSubcollections } from '../content/useUserCollection';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../identity/AuthProvider';

type TrashItem = { id: string; title?: string; name?: string; revision: number; deletedAt: string | null; purgeAfter?: string | null; command: string; listId?: string };
export function Trash() {
  const { user } = useAuth();
  const [confirmation, setConfirmation] = useState<TrashItem | 'all' | null>(null);
  const batch = useRef<{ operationId: string; cutoff: string } | null>(null);
  const activities = useUserCollection<Activity>('activities', false, true); const notes = useUserCollection<Note>('notes', false, true); const lists = useUserCollection<ShoppingList>('shoppingLists'); const categories = useUserCollection<Category>('categories', false, true);
  const shoppingItems = useUserSubcollections<ShoppingItem>('shoppingLists', lists.items.map(item => item.id), 'items', true);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); useEffect(() => { document.title = 'Lixeira · Leve'; }, []);
  const items: TrashItem[] = [
    ...activities.items.map(item => ({ ...item, command: 'activity.restore' })), ...notes.items.map(item => ({ ...item, command: 'note.restore' })),
    ...lists.items.map(item => ({ ...item, command: 'shoppingList.restore' })), ...categories.items.map(item => ({ ...item, title: item.name, command: 'category.restore' })),
    ...shoppingItems.items.map(item => ({ ...item, command: 'shoppingItem.restore', title: item.name, listId: item.parentId })),
  ].filter(item => Boolean(item.deletedAt));
  async function restore(item: TrashItem) { setBusy(true); setMessage(''); try { await sendCommand({ command: item.command, operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }); setMessage('Item restaurado.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível restaurar.'); } finally { setBusy(false); } }
  async function purgeConfirmed() {
    if (busy || !confirmation || !user) return;
    setBusy(true); setMessage('');
    try {
      if (confirmation === 'all') {
        batch.current ??= { operationId: crypto.randomUUID(), cutoff: new Date().toISOString() };
        let more = true; let removed = 0;
        while (more) {
          const result = await apiRequest<{ removed: number; more: boolean }>('/commands', { method: 'POST', body: JSON.stringify({ command: 'trash.empty', entityId: user.uid, operationId: batch.current.operationId, payload: { cutoff: batch.current.cutoff } }) });
          removed += result.removed; more = result.more; setMessage(removed + ' itens excluídos…');
        }
        batch.current = null; setMessage('Lixeira esvaziada.');
      } else {
        const item = confirmation;
        await sendCommand({ command: item.command.replace('.restore', '.purge'), operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: item.listId ? { listId: item.listId } : {} }, { queueOnNetworkError: false });
        setMessage('Item excluído permanentemente.');
      }
      setConfirmation(null);
    } catch (failure) { setMessage('A exclusão não terminou. ' + (failure instanceof Error ? failure.message : 'Tente novamente.')); }
    finally { setBusy(false); }
  }
  const loading = activities.loading || notes.loading || lists.loading || categories.loading || shoppingItems.loading;
  const error = activities.error || notes.error || lists.error || categories.error || shoppingItems.error;
  return <main><header className="page-heading"><p className="eyebrow">Retenção de 30 dias</p><h1 id="page-title" tabIndex={-1}>Lixeira</h1><button className="text-button danger" disabled={busy || loading || Boolean(error)} onClick={() => setConfirmation('all')}>Excluir tudo</button></header>{items.length ? <ul className="trash-list">{items.map(item => <li key={`${item.command}-${item.listId ?? 'root'}-${item.id}`}><span><strong title={item.title ?? item.name}>{item.title ?? item.name ?? 'Item sem título'}</strong><small>Disponível até {item.purgeAfter?.slice(0, 10) ?? 'prazo indisponível'}</small></span><div className="row-actions"><button aria-label={`Restaurar ${item.title ?? item.name}`} title="Restaurar" disabled={busy} onClick={() => void restore(item)}><span aria-hidden="true">↶</span></button><button className="danger" aria-label={`Excluir definitivamente ${item.title ?? item.name}`} title="Excluir definitivamente" disabled={busy} onClick={() => setConfirmation(item)}><Icon name="trash" /></button></div></li>)}</ul> : loading ? <p role="status">Carregando lixeira…</p> : !error && <div className="empty"><p>A lixeira está vazia.</p></div>}<p role="status">{activities.error || notes.error || lists.error || categories.error || shoppingItems.error || message}</p>{[activities, notes, categories].map((source, index) => source.partial && <button key={index} onClick={source.loadMore}>Carregar mais {['atividades', 'notas', 'categorias'][index]}</button>)}
    {confirmation && <ConfirmDialog title={confirmation === 'all' ? 'Excluir tudo da lixeira?' : 'Excluir este item?'} onClose={() => { if (!busy) setConfirmation(null); }}><p>Esta ação não pode ser desfeita. Listas excluídas também removem seus itens.</p><div className="dialog-actions"><button disabled={busy} onClick={() => setConfirmation(null)}>Cancelar</button><button className="danger" disabled={busy} onClick={() => void purgeConfirmed()}>{busy ? 'Excluindo…' : 'Confirmar exclusão'}</button></div>{message && <p role="status">{message}</p>}</ConfirmDialog>}
  </main>;
}
