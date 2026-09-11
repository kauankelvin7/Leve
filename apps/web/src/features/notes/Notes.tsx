import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Note } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { sendCommand } from '../../platform/api';
import { useUserCollection } from '../content/useUserCollection';

export function Notes() {
  const { items, loading, error } = useUserCollection<Note>('notes');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<(Note & { id: string }) | null>(null);
  const pending = useRef<CommandEnvelope | null>(null);
  useEffect(() => { document.title = 'Notas · Leve'; }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form);
    const text = String(fields.get('text')).trim();
    const payload = { title: String(fields.get('title')).trim(), bodyDoc: { type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] }, paperColorPreset: editing?.paperColorPreset ?? 'butter', pinned: editing?.pinned ?? false, linkedDate: editing?.linkedDate ?? null, linkedActivityIds: editing?.linkedActivityIds ?? [] };
    if (!pending.current || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) pending.current = { command: 'note.save', operationId: crypto.randomUUID(), entityId: editing?.id ?? crypto.randomUUID(), expectedRevision: editing?.revision ?? 0, payload, clientCreatedAt: new Date().toISOString() };
    setBusy(true); setMessage('');
    try { await sendCommand(pending.current); pending.current = null; setEditing(null); form.reset(); setMessage('Nota salva.'); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seu texto foi preservado.'); } finally { setBusy(false); }
  }
  async function trash(note: Note & { id: string }) {
    setBusy(true); try { await sendCommand({ command: 'note.trash', operationId: crypto.randomUUID(), entityId: note.id, expectedRevision: note.revision, payload: {} }); } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Não foi possível remover.'); } finally { setBusy(false); }
  }
  const active = items.filter(item => !item.deletedAt);
  return <main><header className="page-heading"><p className="eyebrow">Ideias e registros</p><h1 id="page-title" tabIndex={-1}>Notas</h1></header>
    <section className="panel content-form"><h2>{editing ? 'Editar nota' : 'Nova nota'}</h2><form key={editing?.id ?? 'new'} onSubmit={create}><label>Título<input name="title" required maxLength={100} defaultValue={editing?.title ?? ''} /></label><label>Texto<textarea name="text" maxLength={20000} rows={5} defaultValue={editing?.plainText ?? ''} /></label><div className="dialog-actions"><button className="primary" disabled={busy}>{editing ? 'Atualizar nota' : 'Salvar nota'}</button>{editing ? <button type="button" onClick={() => { setEditing(null); pending.current = null; }}>Cancelar</button> : null}</div></form></section>
    {loading ? <p role="status">Carregando…</p> : active.length ? <div className="note-grid">{active.map(note => <article className={`note ${note.paperColorPreset}`} key={note.id}><h2>{note.title}</h2><p>{note.plainText || 'Nota vazia'}</p><div className="dialog-actions"><button disabled={busy} onClick={() => { setEditing(note); pending.current = null; window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button disabled={busy} onClick={() => void trash(note)}>Mover para lixeira</button></div></article>)}</div> : <div className="empty"><p>Você ainda não criou notas.</p></div>}
    <p role="status" className="form-status">{error || message}</p></main>;
}
