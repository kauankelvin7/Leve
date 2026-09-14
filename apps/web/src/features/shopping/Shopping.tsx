import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';

type StoredList = ShoppingList & { id: string };
type StoredItem = ShoppingItem & { id: string; purgeAfter?: string | null };

export function Shopping() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items, loading, error } = useUserCollection<ShoppingList>('shoppingLists');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<StoredList | null>(null);
  const pending = useRef<CommandEnvelope | null>(null);
  useEffect(() => { document.title = 'Compras - Leve'; }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get('title')).trim();
    const listKind = editing?.listKind ?? String(new FormData(form).get('listKind')) as ShoppingList['listKind'];
    const payload = { title, listKind, cycleKey: editing?.cycleKey ?? null };
    const command = editing ? 'shoppingList.update' : 'shoppingList.create';
    const entityId = editing?.id ?? pending.current?.entityId ?? crypto.randomUUID();
    const expectedRevision = editing?.revision ?? 0;
    if (!pending.current || pending.current.command !== command || pending.current.entityId !== entityId || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) {
      pending.current = { command, operationId: crypto.randomUUID(), entityId, expectedRevision, payload };
    }
    setBusy(true); setMessage('');
    try {
      await sendCommand(pending.current);
      pending.current = null;
      setEditing(null);
      form.reset();
      setMessage(editing ? 'Lista atualizada.' : 'Lista criada.');
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel salvar. Seu rascunho foi preservado.');
    } finally {
      setBusy(false);
    }
  }

  async function trash(list: StoredList) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingList.trash', operationId: crypto.randomUUID(), entityId: list.id, expectedRevision: list.revision, payload: {} }); setMessage('Lista movida para a lixeira.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel remover.'); }
    finally { setBusy(false); }
  }

  async function createCycle(template: StoredList) {
    const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: session?.profile?.timeZone }).formatToParts(new Date());
    const cycleKey = `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
    const entityId = crypto.randomUUID();
    setBusy(true); setMessage('');
    try {
      await sendCommand({ command: 'shoppingList.createCycle', operationId: crypto.randomUUID(), entityId, expectedRevision: template.revision, payload: { templateId: template.id, cycleKey }, clientCreatedAt: new Date().toISOString() });
      navigate(`/compras/${entityId}`);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel criar a lista deste mes.');
    } finally {
      setBusy(false);
    }
  }

  const active = items.filter(item => !item.deletedAt && !item.archivedAt && item.listKind !== 'template');
  const templates = items.filter(item => !item.deletedAt && !item.archivedAt && item.listKind === 'template');
  return <main><header className="page-heading"><p className="eyebrow">Listas sincronizadas</p><h1 id="page-title" tabIndex={-1}>Compras</h1><p>Organize o que falta e reutilize suas listas a cada mês.</p></header>
    <section className="panel content-form"><h2>{editing ? 'Editar lista' : 'Nova lista'}</h2><form key={editing?.id ?? 'new'} onSubmit={save}><label>Nome da lista<input name="title" required maxLength={100} defaultValue={editing?.title ?? ''} /></label>{!editing ? <label>Tipo de lista<select name="listKind" defaultValue="regular"><option value="regular">Lista avulsa</option><option value="template">Modelo reutilizável</option></select></label> : null}<div className="dialog-actions"><button className="primary" disabled={busy}>{editing ? 'Atualizar lista' : 'Criar lista'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}</div></form></section>
    {loading ? <p role="status">Carregando...</p> : active.length ? <div className="list-cards">{active.map(list => <article className="panel list-card" key={list.id}><Link to={`/compras/${list.id}`}><strong>{list.title}</strong><small>{list.pendingItemCount ?? list.itemCount} pendentes · {list.itemCount} itens</small></Link><progress className="shopping-progress" aria-label={`Itens comprados em ${list.title}`} max={Math.max(1, list.itemCount)} value={Math.max(0, list.itemCount - (list.pendingItemCount ?? list.itemCount))} /><div className="row-actions"><button disabled={busy} onClick={() => { setEditing(list); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button disabled={busy} onClick={() => void trash(list)}>Excluir</button></div></article>)}</div> : <div className="empty"><p>Você ainda não criou listas de compras.</p></div>}
    {templates.length ? <section className="template-lists" aria-labelledby="shopping-templates"><h2 id="shopping-templates">Modelos reutilizáveis</h2><div className="list-cards">{templates.map(template => <article className="panel list-card" key={template.id}><Link to={`/compras/${template.id}`}><strong>{template.title}</strong><small>{template.itemCount} itens no modelo</small></Link><div className="row-actions"><button className="primary" disabled={busy} onClick={() => void createCycle(template)}>Criar lista deste mês</button><button disabled={busy} onClick={() => { setEditing(template); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button disabled={busy} onClick={() => void trash(template)}>Excluir</button></div></article>)}</div></section> : null}
    <p role="status">{error || message}</p></main>;
}

export function ShoppingDetail() {
  const { id = '' } = useParams();
  const lists = useUserCollection<ShoppingList>('shoppingLists');
  const { items, loading, error } = useUserCollection<ShoppingItem>(`shoppingLists/${id}/items`, true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [unit, setUnit] = useState<ShoppingItem['unit']>('un');
  const pending = useRef<CommandEnvelope | null>(null);
  const list = lists.items.find(item => item.id === id);

  useEffect(() => { document.title = `${list?.title ?? 'Lista de compras'} - Leve`; }, [list?.title]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      listId: id,
      name: String(fields.get('name')).trim(),
      quantityValue: Number(fields.get('quantityValue')) > 0 ? Number(fields.get('quantityValue')) : null,
      unit: String(fields.get('unit')) as ShoppingItem['unit'],
      unitLabel: unit === 'outra' ? String(fields.get('unitLabel') ?? '').trim() : '',
      detail: String(fields.get('detail')).trim(),
      sortOrder: editing?.sortOrder ?? items.length,
    };
    const command = editing ? 'shoppingItem.update' : 'shoppingItem.create';
    const entityId = editing?.id ?? crypto.randomUUID();
    const expectedRevision = editing?.revision ?? 0;
    if (!pending.current || pending.current.command !== command || pending.current.entityId !== entityId || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) {
      pending.current = { command, operationId: crypto.randomUUID(), entityId, expectedRevision, payload };
    }
    setBusy(true); setMessage('');
    try {
      await sendCommand(pending.current);
      pending.current = null;
      setEditing(null);
      form.reset();
      setUnit('un');
      setMessage(editing ? 'Item atualizado.' : 'Item adicionado.');
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel salvar. Seu rascunho foi preservado.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.setChecked', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id, checked: !item.checked } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel atualizar.'); }
    finally { setBusy(false); }
  }

  async function trash(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.trash', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item movido para a lixeira.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel remover.'); }
    finally { setBusy(false); }
  }

  async function restore(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.restore', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item restaurado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Nao foi possivel restaurar.'); }
    finally { setBusy(false); }
  }

  const active: StoredItem[] = items.filter(item => !item.deletedAt) as StoredItem[];
  const deleted: StoredItem[] = items.filter(item => item.deletedAt) as StoredItem[];
  return <main><header className="page-heading"><Link to="/compras">Voltar para listas</Link><h1 id="page-title" tabIndex={-1}>{list?.title ?? 'Lista de compras'}</h1></header>
    <section className="panel content-form"><h2>{editing ? 'Editar item' : 'Novo item'}</h2><form key={editing?.id ?? 'new'} onSubmit={save}><label>Novo item<input name="name" required maxLength={100} defaultValue={editing?.name ?? ''} /></label><div className="date-fields"><label>Quantidade<input name="quantityValue" type="number" min="0" step="0.01" defaultValue={editing?.quantityValue ?? ''} /></label><label htmlFor="item-unit">Unidade<select id="item-unit" aria-label="Unidade" name="unit" value={unit} onChange={event => setUnit(event.target.value as ShoppingItem['unit'])}><option value="un">unidade</option><option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pacote">pacote</option><option value="duzia">duzia</option><option value="outra">outra</option></select></label></div>{unit === 'outra' && <label>Qual unidade?<input name="unitLabel" required placeholder="Ex.: caixa, bandeja" maxLength={30} defaultValue={editing?.unitLabel ?? ''} /></label>}<label>Detalhe<textarea name="detail" maxLength={300} rows={2} defaultValue={editing?.detail ?? ''} /></label><div className="dialog-actions"><button className="primary" disabled={busy}>{editing ? 'Atualizar item' : 'Adicionar item'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}</div></form></section>
    {loading ? <p>Carregando...</p> : <div className="shopping"><div className="section-heading"><h2>Itens da lista</h2><span className="count-badge">{active.filter(item => item.checked).length} de {active.length} comprados</span></div><progress className="shopping-progress" aria-label="Itens comprados" max={Math.max(1, active.length)} value={active.filter(item => item.checked).length} />{active.length === 0 && <p className="muted">Sua lista está vazia. Adicione o primeiro item acima.</p>}{active.map(item => <div className="shopping-item" key={item.id}><label className="check-label"><input type="checkbox" checked={item.checked} disabled={busy} onChange={() => void toggle(item)} /><span className={item.checked ? 'completed' : ''}>{item.name}<small>{item.quantityValue ? `${item.quantityValue} ${item.unitLabel || item.unit}` : item.detail}</small></span></label><div className="row-actions"><button disabled={busy} onClick={() => { setEditing(item); setUnit(item.unit); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button disabled={busy} onClick={() => void trash(item)}>Excluir</button></div></div>)}</div>}
    {deleted.length ? <section aria-labelledby="deleted-items" className="panel content-form"><h2 id="deleted-items">Itens na lixeira</h2><ul className="trash-list">{deleted.map(item => <li key={item.id}><span><strong>{item.name}</strong><small>Disponivel ate {item.purgeAfter?.slice(0, 10) ?? 'prazo indisponivel'}</small></span><button disabled={busy} onClick={() => void restore(item)}>Restaurar</button></li>)}</ul></section> : null}
    <p role="status">{error || lists.error || message}</p></main>;
}
