import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { accountArchiveSchema, type AccountArchive } from '../../../../../packages/domain/src/archive';
import type { Category } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { apiRequest, sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { firestore } from '../../platform/firebase';
import { offlineEnabled, pendingCommands } from '../../platform/outbox';
import { NotificationSettings } from './NotificationSettings';
import { PwaSettings } from './PwaSettings';
import { ThemeSettings } from './ThemeSettings';
import { Icon } from '../../components/ui/Icon';
import { requestTutorial } from '../content/Tutorial';

async function importIdFor(content: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function Settings() {
  const { user, session, refresh, logout } = useAuth(); const { items: categories, error } = useUserCollection<Category>('categories');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [archive, setArchive] = useState<AccountArchive | null>(null);
  const [importCommand, setImportCommand] = useState<CommandEnvelope | null>(null);
  const [editingCategory, setEditingCategory] = useState<(Category & { id: string }) | null>(null);
  useEffect(() => { document.title = 'Preferências · Leve'; }, []);
  async function saveCategory(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); setBusy(true);
    try { await sendCommand({ command: editingCategory ? 'category.update' : 'category.create', operationId: crypto.randomUUID(), entityId: editingCategory?.id ?? crypto.randomUUID(), expectedRevision: editingCategory?.revision ?? 0, payload: { name: String(fields.get('name')), colorHex: String(fields.get('color')), sortOrder: editingCategory?.sortOrder ?? categories.length } }); form.reset(); setEditingCategory(null); setMessage(editingCategory ? 'Categoria atualizada.' : 'Categoria criada.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar.'); } finally { setBusy(false); } }
  async function archiveCategory(category: Category & { id: string }) { setBusy(true); try { await sendCommand({ command: 'category.archive', operationId: crypto.randomUUID(), entityId: category.id, expectedRevision: category.revision, payload: {} }); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível arquivar.'); } finally { setBusy(false); } }
  async function trashCategory(category: Category & { id: string }) { setBusy(true); try { await sendCommand({ command: 'category.trash', operationId: crypto.randomUUID(), entityId: category.id, expectedRevision: category.revision, payload: {} }); setMessage('Categoria movida para a lixeira.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover.'); } finally { setBusy(false); } }
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); try { await sendCommand({ command: 'profile.update', operationId: crypto.randomUUID(), entityId: session!.uid, expectedRevision: session!.profile!.revision, payload: { displayName: String(fields.get('displayName')), locale: 'pt-BR', weekStartsOn: Number(fields.get('weekStartsOn')), reduceTransparency: fields.get('reduceTransparency') === 'on' } }); await refresh(); setMessage('Preferências salvas.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar.'); } finally { setBusy(false); } }
  async function downloadExport() {
    setBusy(true); setMessage('Preparando exportação…');
    try {
      const data = await apiRequest<AccountArchive>('/account/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `leve-export-${data.exportedAt.slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
      setMessage('Exportação concluída. Guarde o arquivo em local seguro.');
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível exportar.'); }
    finally { setBusy(false); }
  }
  async function selectImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setArchive(null); setImportCommand(null); setMessage('');
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage('O arquivo excede o limite de 5 MB.'); return; }
    try { const content = await file.text(); const parsed = accountArchiveSchema.parse(JSON.parse(content)); const importId = await importIdFor(content); setArchive(parsed); setImportCommand({ command: 'account.import', operationId: crypto.randomUUID(), entityId: importId, payload: { importId, archive: parsed }, clientCreatedAt: new Date().toISOString() }); setMessage('Arquivo válido. Revise o resumo antes de importar.'); }
    catch { setMessage('Este não é um arquivo de exportação Leve compatível.'); }
  }
  async function importArchive() {
    if (!archive || !importCommand) return; setBusy(true); setMessage('Importando cópias…');
    try { await sendCommand(importCommand); setArchive(null); setImportCommand(null); setMessage('Importação concluída sem substituir seus dados atuais.'); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível importar.'); }
    finally { setBusy(false); }
  }
  async function deleteOwnAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || !session) return; const fields = new FormData(event.currentTarget); const confirmation = String(fields.get('confirmation')); const password = String(fields.get('password'));
    if (confirmation !== 'EXCLUIR') { setMessage('Digite EXCLUIR para confirmar.'); return; }
    setBusy(true); setMessage('Confirmando sua identidade…');
    try {
      if (user.providerData.some(provider => provider.providerId === 'password')) {
        if (!user.email || !password) throw new Error('Informe sua senha atual.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      } else await reauthenticateWithPopup(user, new GoogleAuthProvider());
      await sendCommand({ command: 'account.delete', operationId: crypto.randomUUID(), entityId: session.uid, expectedRevision: session.profile!.revision, payload: { confirmation: 'EXCLUIR' } });
      await logout();
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível excluir a conta.'); }
    finally { setBusy(false); }
  }
  async function changeOffline(enabled: boolean) {
    if (!user) return;
    if (!enabled && (await pendingCommands(user.uid)).length) { setMessage('Sincronize as alterações pendentes antes de remover os dados deste aparelho.'); return; }
    localStorage.setItem('leve.offlineEnabled', String(enabled));
    if (!enabled && firestore) { await terminate(firestore); await clearIndexedDbPersistence(firestore); }
    window.location.reload();
  }
  const importCounts = archive ? { categories: archive.data.categories.length, activities: archive.data.activities.length, series: archive.data.series.length, notes: archive.data.notes.length, lists: archive.data.shoppingLists.length, items: archive.data.shoppingLists.reduce((total, list) => total + list.items.length, 0) } : null;
  return <main><header className="page-heading"><p className="eyebrow">Conta e aparência</p><h1 id="page-title" tabIndex={-1}>Preferências</h1><p>Seu perfil, suas cores e o jeito de usar a agenda.</p></header><div className="settings-nav" aria-label="Seções de preferências"><a href="#settings-profile">Perfil</a><a href="#settings-look">Aparência</a><a href="#settings-device">Aparelho</a><a href="#settings-data">Seus dados</a></div><div className="settings-layout"><section id="settings-profile" className="panel content-form"><h2><Icon name="profile" />Perfil</h2><form onSubmit={saveProfile}><label>Nome<input name="displayName" defaultValue={session!.profile!.displayName} required maxLength={80} /></label><label>Primeiro dia da semana<select name="weekStartsOn" defaultValue={session!.profile!.weekStartsOn}><option value="1">Segunda-feira</option><option value="0">Domingo</option></select></label><label className="check-label"><input type="checkbox" name="reduceTransparency" defaultChecked={session!.profile!.reduceTransparency} /> Reduzir transparência</label><button className="primary" disabled={busy}>Salvar preferências</button></form></section><section className="panel content-form"><h2><Icon name="calendar" />{editingCategory ? 'Editar categoria' : 'Categorias'}</h2><form key={editingCategory?.id ?? 'new-category'} onSubmit={saveCategory}><label>Nome<input name="name" required maxLength={40} defaultValue={editingCategory?.name ?? ''} /></label><label>Cor<input name="color" type="color" defaultValue={editingCategory?.colorHex ?? '#86A5C6'} /></label><div className="dialog-actions"><button className="primary" disabled={busy}>{editingCategory ? 'Salvar categoria' : 'Criar categoria'}</button>{editingCategory ? <button type="button" onClick={() => setEditingCategory(null)}>Cancelar</button> : null}</div></form><ul className="settings-list">{categories.filter(item => !item.deletedAt).map(category => <li key={category.id}><span className="color-dot" style={{ background: category.colorHex }} /><strong>{category.name}</strong><div className="row-actions"><button disabled={busy || Boolean(category.archivedAt)} onClick={() => { setEditingCategory(category); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button disabled={busy || Boolean(category.archivedAt)} onClick={() => void archiveCategory(category)}>{category.archivedAt ? 'Arquivada' : 'Arquivar'}</button><button disabled={busy} onClick={() => void trashCategory(category)}>Lixeira</button></div></li>)}</ul></section>
    <div id="settings-look" className="settings-group"><ThemeSettings /></div>
    <div id="settings-device" className="settings-group"><PwaSettings /><NotificationSettings /></div>
    <section className="panel content-form"><h2><Icon name="note" />Uso offline</h2><p>Ative somente em um aparelho pessoal. O conteúdo já aberto e novas alterações poderão ficar armazenados neste dispositivo.</p><label className="check-label"><input type="checkbox" defaultChecked={offlineEnabled()} onChange={event => void changeOffline(event.target.checked)} /> Confiar neste aparelho e permitir uso offline</label></section>
    <section id="settings-data" className="panel content-form"><h2><Icon name="basket" />Seus dados</h2><p>Baixe uma cópia da sua agenda ou traga outra cópia sem substituir o conteúdo atual.</p><button type="button" disabled={busy} onClick={() => void downloadExport()}>Baixar uma cópia</button><label>Arquivo para importar<input type="file" accept="application/json,.json" onChange={event => void selectImport(event)} /></label>{importCounts ? <div className="import-summary"><p><strong>Resumo:</strong> {importCounts.activities} atividades em {importCounts.series} séries, {importCounts.notes} notas, {importCounts.categories} categorias, {importCounts.lists} listas e {importCounts.items} itens.</p><button type="button" className="primary" disabled={busy} onClick={() => void importArchive()}>Importar como cópia</button></div> : null}</section>
    <section className="panel content-form"><h2><Icon name="question" />Tutorial</h2><p>Revise os principais recursos do Leve quando quiser.</p><button type="button" onClick={requestTutorial}>Ver tutorial novamente</button></section><details className="panel content-form danger-zone"><summary>Excluir conta</summary><p>Remove permanentemente a agenda, as notas, as compras e os avisos. Esta ação não pode ser desfeita.</p><form onSubmit={deleteOwnAccount}>{user?.providerData.some(provider => provider.providerId === 'password') ? <label>Senha atual<input name="password" type="password" autoComplete="current-password" /></label> : null}<label>Digite EXCLUIR<input name="confirmation" autoComplete="off" /></label><button className="danger" disabled={busy}>Excluir minha conta</button></form></details></div><p role="status" className="form-status">{error || message}</p></main>;
}
