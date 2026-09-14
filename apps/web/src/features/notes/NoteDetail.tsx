import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Note } from '../../../../../packages/domain/src/content';
import { useUserDocument } from '../content/useUserCollection';
import { NoteBody } from './NoteEditor';
import { LoadingState } from '../../components/ui/LoadingState';

export function NoteDetail() {
  const { id = '' } = useParams();
  const { item: note, loading, error } = useUserDocument<Note>(`notes/${id}`);
  useEffect(() => { document.title = `${note?.title ?? 'Nota'} · Leve`; }, [note?.title]);
  if (loading) return <LoadingState variant="detail" label="Abrindo a nota…" />;
  if (!note || note.deletedAt) return <main><h1 id="page-title" tabIndex={-1}>Nota indisponível</h1><Link to="/notas">Voltar para Notas</Link></main>;
  return <main><header className="page-heading"><p className="eyebrow">Nota</p><h1 id="page-title" tabIndex={-1}>{note.title}</h1></header><article className={`note ${note.paperColorPreset}`}><NoteBody document={note.bodyDoc} />{note.linkedDate ? <p>Vinculada ao dia {note.linkedDate}.</p> : null}</article><Link className="button" to="/notas">Voltar para Notas</Link><p role="status">{error}</p></main>;
}
