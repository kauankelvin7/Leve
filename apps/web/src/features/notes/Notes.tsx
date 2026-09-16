import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Activity, Note, NoteNode } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { ApiError, sendCommand } from '../../platform/api';
import { readDraft, removeDraft, saveDraft } from '../../platform/drafts';
import { useUserCollection } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { NoteEditor, readNoteDocument } from './NoteEditor';
import { Icon } from '../../components/ui/Icon';
import { formatCivilDate } from '../../platform/formatters';
import { uniqueActivitiesForLinking } from './activityLinking';

type StoredNote = Note & { id: string };
type NotePayload = Pick<Note, 'title' | 'bodyDoc' | 'paperColorPreset' | 'pinned' | 'linkedDate' | 'linkedActivityIds'>;
type NoteDraft = { entityId: string; expectedRevision: number; payload: NotePayload };

const emptyDocument: NoteNode = { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
const emptyPayload: NotePayload = { title: '', bodyDoc: emptyDocument, paperColorPreset: 'butter', pinned: false, linkedDate: null, linkedActivityIds: [] };

function NotePreview({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLocaleLowerCase('pt-BR').indexOf(query);
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>;
}

export function Notes() {
  const { user } = useAuth();
  const { items, loading, error } = useUserCollection<Note>('notes');
  const { items: activities } = useUserCollection<Activity>('activities');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<StoredNote | null>(null);
  const [initial, setInitial] = useState<NotePayload>(emptyPayload);
  const [query, setQuery] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [conflict, setConflict] = useState<StoredNote | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pending = useRef<CommandEnvelope | null>(null);
  const saving = useRef(false);
  const entityId = useRef<string>(crypto.randomUUID());
  const revision = useRef(0);
  const localTimer = useRef<number | null>(null);
  const localMaximumTimer = useRef<number | null>(null);
  const remoteTimer = useRef<number | null>(null);
  const draftName = editing ? `note:${editing.id}` : 'note:new';

  useEffect(() => { document.title = 'Notas · Leve'; }, []);
  useEffect(() => {
    if (!user || editing) return;
    void readDraft<NoteDraft>(user.uid, 'note:new').then(draft => {
      if (!draft || payloadFromForm()?.title || editorRef.current?.textContent) return;
      entityId.current = draft.entityId; revision.current = draft.expectedRevision; setInitial(draft.payload); setFormVersion(value => value + 1);
      setMessage('Rascunho recuperado deste aparelho.');
    });
  }, [user, editing]);
  useEffect(() => () => {
    if (localTimer.current) window.clearTimeout(localTimer.current);
    if (localMaximumTimer.current) window.clearTimeout(localMaximumTimer.current);
    if (remoteTimer.current) window.clearTimeout(remoteTimer.current);
  }, []);

  function payloadFromForm(): NotePayload | null {
    const form = formRef.current;
    if (!form) return null;
    const fields = new FormData(form);
    return {
      title: String(fields.get('title')).trim(), bodyDoc: readNoteDocument(editorRef.current),
      paperColorPreset: String(fields.get('paperColorPreset')) as NotePayload['paperColorPreset'], pinned: fields.get('pinned') === 'on',
      linkedDate: String(fields.get('linkedDate')) || null, linkedActivityIds: fields.getAll('linkedActivityIds').map(String),
    };
  }

  async function storeLocalDraft() {
    const payload = payloadFromForm();
    if (!user || !payload) return;
    await saveDraft(user.uid, draftName, { entityId: entityId.current, expectedRevision: revision.current, payload } satisfies NoteDraft);
    setMessage('Rascunho salvo neste aparelho.');
  }

  async function persist(close: boolean, allowConflict = false) {
    const payload = payloadFromForm();
    if (!user || !payload || !payload.title || saving.current || (conflict && !allowConflict)) return;
    const serialized = JSON.stringify(payload);
    if (!pending.current || JSON.stringify(pending.current.payload) !== serialized) {
      pending.current = { command: 'note.save', operationId: crypto.randomUUID(), entityId: entityId.current, expectedRevision: revision.current, payload, clientCreatedAt: new Date().toISOString() };
    }
    saving.current = true; setBusy(true); setMessage(close ? 'Salvando nota…' : 'Salvando automaticamente…');
    try {
      const result = await sendCommand(pending.current, { queueOnNetworkError: close });
      revision.current = result.revision; pending.current = null;
      const unchanged = JSON.stringify(payloadFromForm()) === serialized;
      if (unchanged) await removeDraft(user.uid, draftName);
      setMessage('Nota salva.');
      if (close) resetComposer();
      else if (!unchanged) scheduleAutosave();
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'REVISION_CONFLICT') setConflict((failure.details as { current?: StoredNote } | undefined)?.current ?? editing);
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seu texto foi preservado.');
    } finally { saving.current = false; setBusy(false); }
  }

  function scheduleAutosave() {
    if (localTimer.current) window.clearTimeout(localTimer.current);
    localTimer.current = window.setTimeout(() => { localTimer.current = null; if (localMaximumTimer.current) window.clearTimeout(localMaximumTimer.current); localMaximumTimer.current = null; void storeLocalDraft(); }, 300);
    if (!localMaximumTimer.current) localMaximumTimer.current = window.setTimeout(() => { localMaximumTimer.current = null; if (localTimer.current) window.clearTimeout(localTimer.current); localTimer.current = null; void storeLocalDraft(); }, 1000);
    if (remoteTimer.current) window.clearTimeout(remoteTimer.current);
    remoteTimer.current = window.setTimeout(() => { remoteTimer.current = null; void persist(false); }, 1200);
  }

  function resetComposer() {
    setEditing(null); setConflict(null); pending.current = null; entityId.current = crypto.randomUUID(); revision.current = 0;
    setInitial(emptyPayload); setFormVersion(value => value + 1);
  }

  async function beginEdit(note: StoredNote) {
    setEditing(note); setConflict(null); pending.current = null; entityId.current = note.id; revision.current = note.revision;
    const stored = user ? await readDraft<NoteDraft>(user.uid, `note:${note.id}`) : null;
    if (stored) revision.current = stored.expectedRevision;
    setInitial(stored?.payload ?? note); setFormVersion(value => value + 1);
    setMessage(stored ? 'Rascunho recuperado deste aparelho.' : ''); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveAsCopy() {
    entityId.current = crypto.randomUUID(); revision.current = 0; pending.current = null; setEditing(null); setConflict(null);
    await persist(true, true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await persist(true); }
  async function trash(note: StoredNote) {
    setBusy(true); try { await sendCommand({ command: 'note.trash', operationId: crypto.randomUUID(), entityId: note.id, expectedRevision: note.revision, payload: {} }); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover.'); } finally { setBusy(false); }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const active = items.filter(item => !item.deletedAt && (!normalizedQuery || `${item.title}\n${item.plainText}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))).sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt));
  const linkableActivities = uniqueActivitiesForLinking(activities, new Set(initial.linkedActivityIds));
  const noteCard = (note: StoredNote) => <article className={`note ${note.paperColorPreset}`} key={note.id}><p className="note-kicker">{note.pinned ? 'Fixada no Meu dia' : 'Nota'}</p><h2>{note.title}</h2><p className="note-preview"><NotePreview text={note.plainText || 'Nota sem texto.'} query={normalizedQuery} /></p>{note.linkedDate ? <small>Vinculada a {formatCivilDate(note.linkedDate)}</small> : null}<div className="dialog-actions"><button disabled={busy} onClick={() => void beginEdit(note)}>Editar</button><button disabled={busy} onClick={() => void trash(note)}>Mover para lixeira</button></div></article>;
  const pinned = active.filter(note => note.pinned); const others = active.filter(note => !note.pinned);
  return <main className="notes-page"><header className="page-heading notes-heading"><div><p className="eyebrow">Ideias e registros</p><h1 id="page-title" tabIndex={-1}>Notas</h1><p>Anotações, ideias e lembretes para consultar quando precisar.</p></div><div className="notes-heading-actions"><span className="notes-count" aria-live="polite">{loading ? 'Carregando…' : `${active.length} ${active.length === 1 ? 'nota ativa' : 'notas ativas'}`}</span><button onClick={() => document.querySelector<HTMLInputElement>('input[name=title]')?.focus()}><Icon name="plus" />Nova nota</button></div></header>
    <section className="panel content-form"><h2>{editing ? 'Editar nota' : 'Nova nota'}</h2><form ref={formRef} key={formVersion} onSubmit={submit} onInput={scheduleAutosave} onChange={scheduleAutosave}><label>Título<input name="title" required maxLength={100} defaultValue={initial.title} /></label><label>Texto<NoteEditor initial={initial.bodyDoc} editorRef={editorRef} onInput={scheduleAutosave} /></label><div className="date-fields"><label>Cor do papel<select name="paperColorPreset" defaultValue={initial.paperColorPreset}><option value="butter">Amarelo claro</option><option value="studies">Lilás</option><option value="personal">Pêssego</option><option value="health">Azul</option><option value="home">Verde</option></select></label><label>Vincular ao dia<input type="date" name="linkedDate" defaultValue={initial.linkedDate ?? ''} /></label></div><fieldset><legend>Atividades vinculadas</legend>{linkableActivities.map(activity => <label className="check-label" key={activity.id}><input type="checkbox" name="linkedActivityIds" value={activity.id} defaultChecked={initial.linkedActivityIds.includes(activity.id)} /> {activity.title}</label>)}</fieldset><label className="check-label"><input type="checkbox" name="pinned" defaultChecked={initial.pinned} /> Fixar no Meu dia</label><div className="dialog-actions"><button className="primary" disabled={busy}>{editing ? 'Concluir edição' : 'Salvar nota'}</button>{editing ? <button type="button" onClick={resetComposer}>Cancelar</button> : null}</div></form>
      {conflict ? <div className="conflict-panel" role="alert"><strong>Esta nota mudou em outra sessão.</strong><p>A versão remota é “{conflict.title}”. Seu rascunho continua neste aparelho.</p><div className="dialog-actions"><button type="button" onClick={() => void beginEdit(conflict)}>Usar versão remota</button><button type="button" className="primary" onClick={() => void saveAsCopy()}>Salvar meu rascunho como cópia</button></div></div> : null}</section>
    <label className="search-field notes-search">Buscar nas notas carregadas<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>{loading ? <p role="status">Carregando suas notas…</p> : active.length ? <div className="note-sections">{pinned.length ? <section aria-labelledby="pinned-notes"><h2 id="pinned-notes">Fixadas <span>{pinned.length}</span></h2><div className="note-grid">{pinned.map(noteCard)}</div></section> : null}{others.length ? <section aria-labelledby="other-notes"><h2 id="other-notes">Outras notas <span>{others.length}</span></h2><div className="note-grid">{others.map(noteCard)}</div></section> : null}</div> : <div className="empty notes-empty"><p>{normalizedQuery ? 'Nenhuma nota combina com esta busca. Tente outra palavra.' : 'Nada escrito ainda. Toque em + para começar.'}</p></div>}
    <p role="status" className="form-status">{error || message}</p></main>;
}
