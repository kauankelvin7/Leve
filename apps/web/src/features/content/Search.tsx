import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Activity, Note, ShoppingItem, ShoppingList } from '../../../../../packages/domain/src/content';
import { useUserCollection, useUserSubcollections } from './useUserCollection';

export function Search() {
  const [term, setTerm] = useState('');
  const activities = useUserCollection<Activity>('activities');
  const notes = useUserCollection<Note>('notes');
  const lists = useUserCollection<ShoppingList>('shoppingLists');
  const items = useUserSubcollections<ShoppingItem>('shoppingLists', lists.items.map(list => list.id), 'items');
  useEffect(() => { document.title = 'Buscar · Leve'; }, []);
  const query = term.trim().toLocaleLowerCase('pt-BR');
  const includes = (...values: unknown[]) => query && values.some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(query));
  const results = [
    ...activities.items.filter(item => !item.deletedAt && includes(item.title, item.descriptionPlain)).map(item => ({ key: `activity-${item.id}`, title: item.title, kind: 'Atividade', to: `/atividade/${item.id}` })),
    ...notes.items.filter(item => !item.deletedAt && includes(item.title, item.plainText)).map(item => ({ key: `note-${item.id}`, title: item.title, kind: 'Nota', to: `/notas/${item.id}` })),
    ...lists.items.filter(item => !item.deletedAt && includes(item.title)).map(item => ({ key: `list-${item.id}`, title: item.title, kind: 'Lista', to: `/compras/${item.id}` })),
    ...items.items.filter(item => !item.deletedAt && includes(item.name, item.detail)).map(item => ({ key: `item-${item.parentId}-${item.id}`, title: item.name, kind: 'Item de compras', to: `/compras/${item.parentId}` })),
  ];
  return <main><header className="page-heading"><p className="eyebrow">Conteúdo pessoal</p><h1 id="page-title" tabIndex={-1}>Buscar</h1><p>Encontre atividades, notas e compras que já apareceram na sua agenda.</p></header><label className="search-field">Título ou texto<input type="search" autoFocus value={term} onChange={event => setTerm(event.target.value)} /></label>{query ? results.length ? <ul className="search-results">{results.map(result => <li key={result.key}><Link to={result.to}><strong>{result.title}</strong><small>{result.kind}</small></Link></li>)}</ul> : <div className="empty"><p>Nada encontrado. Tente outra palavra ou confira a escrita.</p></div> : null}<p role="status">{activities.error || notes.error || lists.error || items.error}</p></main>;
}
