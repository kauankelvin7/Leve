import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { Note } from '../../../../../packages/domain/src/content';
import { useUserDocument } from '../content/useUserCollection';
import { NoteBody } from './NoteEditor';
import { LoadingState } from '../../components/ui/LoadingState';
import { BackButton } from '../../components/ui/BackButton';
import { formatCivilDate } from '../../platform/formatters';

export function NoteDetail() {
  const { id = '' } = useParams();
  const { item: note, loading, error } = useUserDocument<Note>(`notes/${id}`);
  useEffect(() => { document.title = `${note?.title ?? 'Nota'} · Leve`; }, [note?.title]);
  if (loading) return <LoadingState variant="detail" label="Abrindo a nota…" />;
  if (!note || note.deletedAt) return <main><h1 id="page-title" tabIndex={-1}>Nota indisponível</h1><BackButton to="/notas">Voltar às notas</BackButton></main>;
  return <main><header className="page-heading"><BackButton to="/notas" /><p className="eyebrow">Nota</p><h1 id="page-title" tabIndex={-1}>{note.title}</h1></header><article className={`note ${note.paperColorPreset}`}><NoteBody document={note.bodyDoc} />{note.linkedDate ? <p>Vinculada ao dia {formatCivilDate(note.linkedDate)}.</p> : null}</article><p role="status">{error}</p></main>;
}
