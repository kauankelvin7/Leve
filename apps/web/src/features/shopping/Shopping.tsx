import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';

export function Shopping() {
  const { items, loading, error } = useUserCollection<ShoppingList>('shoppingLists');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const pending = useRef<CommandEnvelope | null>(null);
  useEffect(() => { document.title = 'Compras · Leve'; }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const title = String(new FormData(form).get('title')).trim();
    const payload = { title, listKind: 'regular', cycleKey: null };
    if (!pending.current || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) pending.current = { command: 'shoppingList.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload };
    setBusy(true); try { await sendCommand(pending.current); pending.current = null; form.reset(); setMessage('Lista criada.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível criar.'); } finally { setBusy(false); }
  }
  const active = items.filter(item => !item.deletedAt && !item.archivedAt);
  return <main><header className="page-heading"><p className="eyebrow">Listas sincronizadas</p><h1 id="page-title" tabIndex={-1}>Compras</h1></header><section className="panel content-form"><h2>Nova lista</h2><form onSubmit={create}><label>Nome da lista<input name="title" required maxLength={100} /></label><button className="primary" disabled={busy}>Criar lista</button></form></section>
    {loading ? <p role="status">Carregando…</p> : active.length ? <div className="list-cards">{active.map(list => <Link className="panel" key={list.id} to={`/compras/${list.id}`}><strong>{list.title}</strong><small>{list.itemCount} itens</small></Link>)}</div> : <div className="empty"><p>Você ainda não criou listas de compras.</p></div>}<p role="status">{error || message}</p></main>;
}

export function ShoppingDetail() {
  const { id = '' } = useParams(); const { items, loading, error } = useUserCollection<ShoppingItem>(`shoppingLists/${id}/items`, true);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const name = String(new FormData(form).get('name')).trim(); setBusy(true);
    try { await sendCommand({ command: 'shoppingItem.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: { listId: id, name, quantityValue: null, unit: 'un', unitLabel: '', detail: '', sortOrder: items.length } }); form.reset(); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível adicionar.'); } finally { setBusy(false); }
  }
  async function toggle(item: ShoppingItem & { id: string }) { setBusy(true); try { await sendCommand({ command: 'shoppingItem.setChecked', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id, checked: !item.checked } }); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar.'); } finally { setBusy(false); } }
  return <main><header className="page-heading"><Link to="/compras">← Todas as listas</Link><h1 id="page-title" tabIndex={-1}>Lista de compras</h1></header><section className="panel content-form"><form onSubmit={create}><label>Novo item<input name="name" required maxLength={100} /></label><button className="primary" disabled={busy}>Adicionar item</button></form></section>{loading ? <p>Carregando…</p> : <div className="shopping">{items.filter(item => !item.deletedAt).map(item => <label className="shopping-item" key={item.id}><input type="checkbox" checked={item.checked} disabled={busy} onChange={() => void toggle(item)} /><span className={item.checked ? 'completed' : ''}>{item.name}</span></label>)}</div>}<p role="status">{error || message}</p></main>;
}
