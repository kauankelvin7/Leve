import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { ApiError, sendCommand } from '../../platform/api';
import { useUserCollection, useUserDocument } from '../content/useUserCollection';
import { Icon } from '../../components/ui/Icon';
import { BackButton } from '../../components/ui/BackButton';
import { ShoppingItemsSection, type StoredShoppingItem } from './ShoppingItemsSection';
import styles from './ShoppingItemComposer.module.css';
import { LoadingState } from '../../components/ui/LoadingState';
import { UnavailableState } from '../../components/ui/UnavailableState';

export function ShoppingDetail() {
  const { id = '' } = useParams();
  const { item: list, loading: listLoading, error: listError } = useUserDocument<ShoppingList>(`shoppingLists/${id}`);
  const { items, loading, error } = useUserCollection<ShoppingItem>(`shoppingLists/${id}/items`, true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<StoredShoppingItem | null>(null);
  const [unit, setUnit] = useState<ShoppingItem['unit']>('un');
  const pending = useRef<CommandEnvelope | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

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
      setMessage(editing ? 'Item atualizado.' : 'Item adicionado à lista.');
      if (!editing) window.setTimeout(() => nameInput.current?.focus(), 0);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'SAVED_LOCALLY') {
        pending.current = null;
        setEditing(null);
        form.reset();
        setUnit('un');
        setMessage(failure.message);
        if (!editing) window.setTimeout(() => nameInput.current?.focus(), 0);
      } else {
        setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar. O item continua preenchido.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: StoredShoppingItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.setChecked', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id, checked: !item.checked } }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function trash(item: StoredShoppingItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.trash', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item movido para a lixeira.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function restore(item: StoredShoppingItem) {
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'shoppingItem.restore', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.revision, payload: { listId: id } }); setMessage('Item restaurado.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível restaurar o item. Tente novamente.'); }
    finally { setBusy(false); }
  }

  const active: StoredShoppingItem[] = items.filter(item => !item.deletedAt) as StoredShoppingItem[];
  const deleted: StoredShoppingItem[] = items.filter(item => item.deletedAt) as StoredShoppingItem[];
  const pendingItems = active.filter(item => !item.checked); const completedItems = active.filter(item => item.checked);
  const completion = active.length ? Math.round(completedItems.length / active.length * 100) : 0;
  const editItem = (item: StoredShoppingItem) => { setEditing(item); setUnit(item.unit); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  if (listLoading) return <LoadingState variant="detail" label="Abrindo a lista…" />;
  if (!list || list.deletedAt) return <UnavailableState title={listError ? 'Não foi possível abrir a lista' : 'Lista indisponível'} description={listError || 'Esta lista pode ter sido removida. Você pode voltar às suas compras.'} to="/compras" backLabel="Voltar às compras" icon="basket" retry={Boolean(listError)} />;
  return <main className="shopping-detail-page"><header className="page-heading shopping-detail-heading"><BackButton to="/compras" /><div><p className="eyebrow">Lista de compras</p><h1 id="page-title" tabIndex={-1}>{list?.title ?? 'Lista de compras'}</h1><p>{pendingItems.length ? `${pendingItems.length} ${pendingItems.length === 1 ? 'item ainda falta' : 'itens ainda faltam'}` : active.length ? 'Tudo marcado. Sua lista está pronta.' : 'Lista vazia.'}</p></div><span className="shopping-detail-progress"><strong>{completion}%</strong><small>concluído</small></span></header>
    <section data-testid="shopping-item-composer" className={`panel content-form shopping-composer ${styles.composer}`}>
      <div className="shopping-composer-heading"><span className="shopping-list-icon"><Icon name="plus" /></span><div><p className="eyebrow">{editing ? 'Ajuste o item' : 'Inclusão rápida'}</p><h2>{editing ? 'Editar item' : 'Adicionar item'}</h2></div></div>
      <form className={styles.composerForm} key={editing?.id ?? 'new'} onSubmit={save}>
        <label className={styles.nameField}>Adicionar item<input ref={nameInput} name="name" required maxLength={100} autoFocus={!loading && active.length === 0} placeholder="Ex.: arroz" defaultValue={editing?.name ?? ''} /></label>
        <details className="optional-fields compact-options" open={Boolean(editing)}>
          <summary>Quantidade e detalhes <span>opcional</span></summary>
          <div className={`optional-fields-content ${styles.itemFields}`}>
            <label>Quantidade<input name="quantityValue" type="number" min="0" step="0.01" placeholder="1" defaultValue={editing?.quantityValue ?? ''} /></label>
            <label htmlFor="item-unit">Unidade<select id="item-unit" aria-label="Unidade" name="unit" value={unit} onChange={event => setUnit(event.target.value as ShoppingItem['unit'])}><option value="un">unidade</option><option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pacote">pacote</option><option value="duzia">dúzia</option><option value="outra">outra</option></select></label>
            {unit === 'outra' && <label>Qual unidade?<input name="unitLabel" required placeholder="Ex.: caixa" maxLength={30} defaultValue={editing?.unitLabel ?? ''} /></label>}
            <label>Observação<textarea name="detail" maxLength={300} rows={1} placeholder="Marca, tamanho ou outro detalhe" defaultValue={editing?.detail ?? ''} /></label>
          </div>
        </details>
        <div className="dialog-actions"><button className="primary" disabled={busy}><Icon name="plus" />{editing ? 'Salvar item' : 'Adicionar item'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); pending.current = null; setUnit('un'); }}>Cancelar</button> : null}</div>
      </form>
    </section>
    {(error || listError || message) ? <p role={(error || listError) ? 'alert' : 'status'} className="form-status shopping-feedback" aria-live="polite">{error || listError || message}</p> : null}
    <ShoppingItemsSection active={active} deleted={deleted} pending={pendingItems} completed={completedItems} loading={loading} busy={busy} onToggle={item => void toggle(item)} onEdit={editItem} onTrash={item => void trash(item)} onRestore={item => void restore(item)} />
</main>;
}
