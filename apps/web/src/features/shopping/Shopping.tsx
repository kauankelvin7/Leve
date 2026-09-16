import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { Icon } from '../../components/ui/Icon';
import { BackButton } from '../../components/ui/BackButton';
import { formatDateTimeDate } from '../../platform/formatters';

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
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seu rascunho continua aqui.');
    } finally {
      setBusy(false);
    }
  }

  async function trash(list: StoredList) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingList.trash', operationId: crypto.randomUUID(), entityId: list.id, expectedRevision: list.revision, payload: {} }); setMessage('Lista movida para a lixeira.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover a lista. Tente novamente.'); }
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
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível criar a lista deste mês. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const active = items.filter(item => !item.deletedAt && !item.archivedAt && item.listKind !== 'template');
  const templates = items.filter(item => !item.deletedAt && !item.archivedAt && item.listKind === 'template');
  const totalItems = active.reduce((sum, list) => sum + list.itemCount, 0);
  const pendingItems = active.reduce((sum, list) => sum + (list.pendingItemCount ?? list.itemCount), 0);
  return <main className="shopping-page"><header className="page-heading shopping-heading"><div><p className="eyebrow">Suas listas</p><h1 id="page-title" tabIndex={-1}>Compras</h1><p>Veja o que falta, marque o que já pegou e reutilize listas recorrentes.</p></div><button className="primary" onClick={() => document.querySelector<HTMLInputElement>('input[name=title]')?.focus()}><Icon name="plus" />Nova lista</button></header>
    <section className="shopping-overview" aria-label="Resumo das compras"><span><strong>{active.length}</strong><small>{active.length === 1 ? 'lista ativa' : 'listas ativas'}</small></span><span><strong>{pendingItems}</strong><small>{pendingItems === 1 ? 'item pendente' : 'itens pendentes'}</small></span><span><strong>{Math.max(0, totalItems - pendingItems)}</strong><small>já concluídos</small></span></section>
    <section className="panel content-form shopping-list-composer"><div className="shopping-composer-heading"><span className="shopping-list-icon"><Icon name={editing ? 'note' : 'plus'} /></span><div><p className="eyebrow">{editing ? 'Ajuste a lista' : 'Comece por aqui'}</p><h2>{editing ? 'Editar lista' : 'Criar uma lista'}</h2></div></div><form key={editing?.id ?? 'new'} onSubmit={save}><label>Nome da lista<input name="title" required maxLength={100} placeholder="Ex.: mercado da semana" defaultValue={editing?.title ?? ''} /></label>{!editing ? <label>Como pretende usar?<select name="listKind" defaultValue="regular"><option value="regular">Lista para agora</option><option value="template">Modelo para reutilizar</option></select></label> : null}<div className="dialog-actions"><button className="primary" disabled={busy}>{editing ? 'Salvar alterações' : 'Criar lista'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}</div></form></section>
    <section className="shopping-lists-section" aria-labelledby="active-shopping-lists"><div className="section-heading"><div><p className="eyebrow">Em andamento</p><h2 id="active-shopping-lists">Listas atuais</h2></div><span className="count-badge">{active.length}</span></div>{loading ? <p role="status">Carregando suas listas…</p> : active.length ? <div className="list-cards shopping-list-cards">{active.map(list => { const completed = Math.max(0, list.itemCount - (list.pendingItemCount ?? list.itemCount)); const percentage = list.itemCount ? Math.round(completed / list.itemCount * 100) : 0; return <article className="panel list-card shopping-list-card" key={list.id}><Link className="shopping-list-main" to={`/compras/${list.id}`}><span className="shopping-list-icon"><Icon name="basket" /></span><span><strong>{list.title}</strong><small>{list.itemCount ? `${completed} de ${list.itemCount} concluídos` : 'Lista vazia. Adicione o primeiro item.'}</small></span><b aria-hidden="true">{percentage}%</b></Link><progress className="shopping-progress" aria-label={`Itens concluídos em ${list.title}`} max={Math.max(1, list.itemCount)} value={completed} /><div className="row-actions"><button disabled={busy} onClick={() => { setEditing(list); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button className="text-button danger" disabled={busy} onClick={() => void trash(list)}>Excluir</button></div></article>; })}</div> : <div className="empty"><span className="empty-icon"><Icon name="basket" /></span><p>Nenhuma lista por aqui. Crie uma acima e comece pelo primeiro item.</p></div>}</section>
    {templates.length ? <section className="template-lists" aria-labelledby="shopping-templates"><div className="section-heading"><div><p className="eyebrow">Para usar de novo</p><h2 id="shopping-templates">Modelos</h2></div><span className="count-badge">{templates.length}</span></div><div className="list-cards shopping-template-cards">{templates.map(template => <article className="panel list-card" key={template.id}><Link to={`/compras/${template.id}`}><strong>{template.title}</strong><small>{template.itemCount} {template.itemCount === 1 ? 'item salvo' : 'itens salvos'}</small></Link><div className="row-actions"><button disabled={busy} onClick={() => void createCycle(template)}><Icon name="plus" />Usar neste mês</button><button disabled={busy} onClick={() => { setEditing(template); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button className="text-button danger" disabled={busy} onClick={() => void trash(template)}>Excluir</button></div></article>)}</div></section> : null}
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
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar. O item continua preenchido.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.setChecked', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id, checked: !item.checked } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function trash(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.trash', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item movido para a lixeira.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function restore(item: StoredItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.restore', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item restaurado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível restaurar o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  const active: StoredItem[] = items.filter(item => !item.deletedAt) as StoredItem[];
  const deleted: StoredItem[] = items.filter(item => item.deletedAt) as StoredItem[];
  const pendingItems = active.filter(item => !item.checked); const completedItems = active.filter(item => item.checked);
  const completion = active.length ? Math.round(completedItems.length / active.length * 100) : 0;
  const editItem = (item: StoredItem) => { setEditing(item); setUnit(item.unit); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const itemRow = (item: StoredItem) => <div className="shopping-item" key={item.id}><input aria-label={`Marcar ${item.name} como ${item.checked ? 'pendente' : 'concluído'}`} type="checkbox" checked={item.checked} disabled={busy} onChange={() => void toggle(item)} /><button className="shopping-item-content" disabled={busy} onClick={() => editItem(item)}><span className={item.checked ? 'completed' : ''}>{item.name}</span><small>{item.quantityValue ? `${item.quantityValue} ${item.unitLabel || item.unit}` : item.detail || 'Toque para informar quantidade'}</small></button><button className="icon-button danger" aria-label={`Excluir ${item.name}`} title="Excluir item" disabled={busy} onClick={() => void trash(item)}><Icon name="trash" /></button></div>;
  return <main className="shopping-detail-page"><header className="page-heading shopping-detail-heading"><BackButton to="/compras" /><div><p className="eyebrow">Lista de compras</p><h1 id="page-title" tabIndex={-1}>{list?.title ?? 'Lista de compras'}</h1><p>{pendingItems.length ? `${pendingItems.length} ${pendingItems.length === 1 ? 'item ainda falta' : 'itens ainda faltam'}` : active.length ? 'Tudo marcado. Sua lista está pronta.' : 'Comece adicionando o primeiro item.'}</p></div><span className="shopping-detail-progress"><strong>{completion}%</strong><small>concluído</small></span></header>
    <section className="panel content-form shopping-composer"><div className="shopping-composer-heading"><span className="shopping-list-icon"><Icon name="plus" /></span><div><p className="eyebrow">{editing ? 'Ajuste o item' : 'Inclusão rápida'}</p><h2>{editing ? 'Editar item' : 'Adicionar item'}</h2></div></div><form key={editing?.id ?? 'new'} onSubmit={save}><label className="shopping-name-field">O que você precisa?<input name="name" required maxLength={100} autoFocus={!loading && active.length === 0} placeholder="Digite o nome do item" defaultValue={editing?.name ?? ''} /></label><div className="shopping-item-fields"><label>Quantidade<input name="quantityValue" type="number" min="0" step="0.01" placeholder="1" defaultValue={editing?.quantityValue ?? ''} /></label><label htmlFor="item-unit">Unidade<select id="item-unit" aria-label="Unidade" name="unit" value={unit} onChange={event => setUnit(event.target.value as ShoppingItem['unit'])}><option value="un">unidade</option><option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pacote">pacote</option><option value="duzia">dúzia</option><option value="outra">outra</option></select></label>{unit === 'outra' && <label>Qual unidade?<input name="unitLabel" required placeholder="Ex.: caixa" maxLength={30} defaultValue={editing?.unitLabel ?? ''} /></label>}<label>Observação<textarea name="detail" maxLength={300} rows={1} placeholder="Marca ou detalhe opcional" defaultValue={editing?.detail ?? ''} /></label></div><div className="dialog-actions"><button className="primary" disabled={busy}><Icon name="plus" />{editing ? 'Salvar item' : 'Adicionar item'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}</div></form></section>
    {loading ? <p role="status">Carregando os itens…</p> : <section className="shopping panel"><div className="section-heading"><div><p className="eyebrow">Sua lista</p><h2>Para comprar</h2></div><span className="count-badge">{completedItems.length} de {active.length} concluídos</span></div><progress className="shopping-progress" aria-label="Itens concluídos" max={Math.max(1, active.length)} value={completedItems.length} />{active.length === 0 && <div className="shopping-empty"><span className="empty-icon"><Icon name="basket" /></span><strong>A lista está vazia</strong><p>Digite o primeiro item no campo acima.</p></div>}{pendingItems.length ? <div className="shopping-pending-items">{pendingItems.map(itemRow)}</div> : null}{completedItems.length ? <details className="completed-shopping"><summary><span>Concluídos</span><small>{completedItems.length}</small></summary>{completedItems.map(itemRow)}</details> : null}</section>}
    {deleted.length ? <details className="panel content-form deleted-shopping-items"><summary>Itens removidos ({deleted.length})</summary><ul className="trash-list">{deleted.map(item => <li key={item.id}><span><strong>{item.name}</strong><small>Disponível até {formatDateTimeDate(item.purgeAfter) || 'data não informada'}</small></span><button disabled={busy} onClick={() => void restore(item)}><Icon name="restore" />Restaurar</button></li>)}</ul></details> : null}
    <p role="status">{error || lists.error || message}</p></main>;
}
