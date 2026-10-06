import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { Icon } from '../../components/ui/Icon';
import styles from './ShoppingListComposer.module.css';
import pageStyles from './Shopping.module.css';

type StoredList = ShoppingList & { id: string };

export function Shopping() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items, loading, error } = useUserCollection<ShoppingList>('shoppingLists');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<StoredList | null>(null);
  const pending = useRef<CommandEnvelope | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => { document.title = 'Compras - Leve'; }, []);

  function startNewList() {
    setEditing(null);
    pending.current = null;
    setMessage('');
    window.setTimeout(() => titleInput.current?.focus(), 0);
  }

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
      if (editing) {
        setEditing(null);
        form.reset();
        setMessage('Lista atualizada.');
      } else {
        navigate(`/compras/${entityId}`);
      }
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
  return <main className={`shopping-page ${pageStyles.page}`}><header className="page-heading shopping-heading"><div><p className="eyebrow">Suas listas</p><h1 id="page-title" tabIndex={-1}>Compras</h1><p>O que falta comprar.</p></div><button className="primary" onClick={startNewList}><Icon name="plus" />Nova lista</button></header>
    <section className={`shopping-overview ${pageStyles.overview}`} aria-label="Resumo das compras"><span><strong>{active.length}</strong><small>{active.length === 1 ? 'lista ativa' : 'listas ativas'}</small></span><span><strong>{pendingItems}</strong><small>{pendingItems === 1 ? 'item pendente' : 'itens pendentes'}</small></span><span><strong>{Math.max(0, totalItems - pendingItems)}</strong><small>já concluídos</small></span></section>
    {error ? <p role="alert" className="form-status" aria-live="polite">{error}</p> : null}
    <section className="shopping-lists-section" aria-labelledby="active-shopping-lists"><div className="section-heading"><div><p className="eyebrow">Em andamento</p><h2 id="active-shopping-lists">Listas atuais</h2></div><span className="count-badge">{active.length}</span></div>{loading ? <p role="status">Carregando suas listas…</p> : active.length ? <div className="list-cards shopping-list-cards">{active.map(list => { const completed = Math.max(0, list.itemCount - (list.pendingItemCount ?? list.itemCount)); const percentage = list.itemCount ? Math.round(completed / list.itemCount * 100) : 0; return <article className="panel list-card shopping-list-card" key={list.id}><Link className="shopping-list-main" to={`/compras/${list.id}`}><span className="shopping-list-icon"><Icon name="basket" /></span><span><strong>{list.title}</strong><small>{list.itemCount ? `${completed} de ${list.itemCount} concluídos` : 'Lista vazia.'}</small></span><b aria-hidden="true">{percentage}%</b></Link><progress className="shopping-progress" aria-label={`Itens concluídos em ${list.title}`} max={Math.max(1, list.itemCount)} value={completed} /><div className="row-actions"><button disabled={busy} onClick={() => { setEditing(list); pending.current = null; window.setTimeout(() => titleInput.current?.focus(), 0); }}>Editar</button><button className="text-button danger" disabled={busy} onClick={() => void trash(list)}>Excluir</button></div></article>; })}</div> : <div className="empty"><span className="empty-icon"><Icon name="basket" /></span><p>Nenhuma lista ainda.</p><button type="button" className="text-link" onClick={startNewList}>Criar primeira lista</button></div>}</section>
    {templates.length ? <section className="template-lists" aria-labelledby="shopping-templates"><div className="section-heading"><div><p className="eyebrow">Para usar de novo</p><h2 id="shopping-templates">Modelos</h2></div><span className="count-badge">{templates.length}</span></div><div className="list-cards shopping-template-cards">{templates.map(template => <article className="panel list-card" key={template.id}><Link to={`/compras/${template.id}`}><strong>{template.title}</strong><small>{template.itemCount} {template.itemCount === 1 ? 'item salvo' : 'itens salvos'}</small></Link><div className="row-actions"><button disabled={busy} onClick={() => void createCycle(template)}><Icon name="plus" />Usar neste mês</button><button disabled={busy} onClick={() => { setEditing(template); pending.current = null; window.setTimeout(() => titleInput.current?.focus(), 0); }}>Editar</button><button className="text-button danger" disabled={busy} onClick={() => void trash(template)}>Excluir</button></div></article>)}</div></section> : null}
    <section data-testid="shopping-list-composer" className={`panel content-form ${styles.composer} ${pageStyles.composer}`}>
      <div className={`shopping-composer-heading ${styles.heading}`}>
        <span className="shopping-list-icon"><Icon name={editing ? 'note' : 'plus'} /></span>
        <div>
          <p className="eyebrow">{editing ? 'Editar' : 'Nova lista'}</p>
          <h2>{editing ? 'Editar lista' : 'Criar uma lista'}</h2>
        </div>
      </div>
      <form className={styles.form} key={editing?.id ?? 'new'} onSubmit={save}>
        <label>Nome da lista<input ref={titleInput} name="title" required maxLength={100} placeholder="Ex.: mercado da semana" defaultValue={editing?.title ?? ''} /></label>
        {!editing ? <details className="optional-fields"><summary>Opções da lista <span>opcional</span></summary><div className="optional-fields-content"><label>Uso da lista<select name="listKind" defaultValue="regular"><option value="regular">Lista normal</option><option value="template">Modelo reutilizável</option></select></label><p className="field-hint">Modelo = lista reutilizável.</p></div></details> : null}
        <div className={`dialog-actions ${styles.actions}`}>
          <button className="primary" disabled={busy}>{editing ? 'Salvar alterações' : 'Criar lista'}</button>
          {editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}
        </div>
      </form>
    </section>
    {message ? <p role="status" className="form-status shopping-feedback" aria-live="polite">{message}</p> : null}
</main>;
}
