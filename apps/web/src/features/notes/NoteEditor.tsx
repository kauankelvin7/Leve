import { useEffect, useRef, type ReactNode } from 'react';
import type { NoteNode } from '../../../../../packages/domain/src/content';

function escapeText(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function nodeHtml(node: NoteNode): string {
  if (node.type === 'text') {
    let content = escapeText(node.text ?? '');
    for (const mark of node.marks ?? []) content = mark.type === 'bold' ? `<strong>${content}</strong>` : `<mark>${content}</mark>`;
    return content;
  }
  if (node.type === 'hardBreak') return '<br>';
  const tag = { doc: '', paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li' }[node.type];
  const content = (node.content ?? []).map(nodeHtml).join('');
  return tag ? `<${tag}>${content || (tag === 'p' ? '<br>' : '')}</${tag}>` : content;
}

function inlineNodes(parent: Node, marks: NoteNode['marks'] = []): NoteNode[] {
  if (parent.nodeType === Node.TEXT_NODE) return parent.textContent ? [{ type: 'text', text: parent.textContent, ...(marks.length ? { marks } : {}) }] : [];
  if (!(parent instanceof HTMLElement)) return [];
  if (parent.tagName === 'BR') return [{ type: 'hardBreak' }];
  const nextMarks = [...marks];
  if (['B', 'STRONG'].includes(parent.tagName) && !nextMarks.some(mark => mark.type === 'bold')) nextMarks.push({ type: 'bold' });
  const highlighted = parent.tagName === 'MARK' || parent.style.backgroundColor !== '';
  if (highlighted && !nextMarks.some(mark => mark.type === 'highlight')) nextMarks.push({ type: 'highlight', attrs: { color: null } });
  return [...parent.childNodes].flatMap(child => inlineNodes(child, nextMarks));
}

function blockNode(element: HTMLElement): NoteNode | null {
  if (element.tagName === 'UL' || element.tagName === 'OL') return { type: element.tagName === 'UL' ? 'bulletList' : 'orderedList', content: [...element.children].filter(child => child.tagName === 'LI').map(child => blockNode(child as HTMLElement)!).filter(Boolean) };
  if (element.tagName === 'LI') {
    const nested = [...element.children].filter(child => child.tagName === 'UL' || child.tagName === 'OL').map(child => blockNode(child as HTMLElement)!).filter(Boolean);
    const inline = [...element.childNodes].filter(child => !(child instanceof HTMLElement && ['UL', 'OL'].includes(child.tagName))).flatMap(child => inlineNodes(child));
    return { type: 'listItem', content: [{ type: 'paragraph', content: inline }, ...nested] };
  }
  return { type: 'paragraph', content: [...element.childNodes].flatMap(child => inlineNodes(child)) };
}

export function readNoteDocument(editor: HTMLElement | null): NoteNode {
  if (!editor) return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  const content: NoteNode[] = [];
  for (const child of editor.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent) content.push({ type: 'paragraph', content: inlineNodes(child) });
    } else if (child instanceof HTMLElement) content.push(blockNode(child)!);
  }
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph', content: [] }] };
}

function renderNode(node: NoteNode, key: number): ReactNode {
  if (node.type === 'text') {
    let content: ReactNode = node.text;
    for (const mark of node.marks ?? []) content = mark.type === 'bold' ? <strong>{content}</strong> : <mark>{content}</mark>;
    return <span key={key}>{content}</span>;
  }
  if (node.type === 'hardBreak') return <br key={key} />;
  const children = node.content?.map(renderNode);
  if (node.type === 'paragraph') return <p key={key}>{children}</p>;
  if (node.type === 'bulletList') return <ul key={key}>{children}</ul>;
  if (node.type === 'orderedList') return <ol key={key}>{children}</ol>;
  if (node.type === 'listItem') return <li key={key}>{children}</li>;
  return <div key={key}>{children}</div>;
}

export function NoteBody({ document }: { document: NoteNode }) {
  return <div className="note-body">{document.content?.map(renderNode)}</div>;
}

export function NoteEditor({ initial, editorRef, onInput }: { initial: NoteNode; editorRef: React.RefObject<HTMLDivElement | null>; onInput?: () => void }) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && editorRef.current) { editorRef.current.innerHTML = nodeHtml(initial); initialized.current = true; }
  }, [initial, editorRef]);
  function format(command: 'bold' | 'insertUnorderedList' | 'insertOrderedList' | 'hiliteColor') {
    editorRef.current?.focus(); document.execCommand(command, false, command === 'hiliteColor' ? '#fff1a8' : undefined);
  }
  function pastePlain(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  }
  return <div className="rich-editor"><div className="editor-toolbar" aria-label="Formatação da nota"><button type="button" aria-label="Negrito" title="Negrito" onClick={() => format('bold')}><strong>B</strong></button><button type="button" aria-label="Lista com marcadores" title="Lista com marcadores" onClick={() => format('insertUnorderedList')}>• Lista</button><button type="button" aria-label="Lista numerada" title="Lista numerada" onClick={() => format('insertOrderedList')}>1. Lista</button><button type="button" aria-label="Destacar trecho" title="Destacar trecho" onClick={() => format('hiliteColor')}>Destacar</button></div><div ref={editorRef} className="editor-surface" contentEditable role="textbox" aria-label="Texto" aria-multiline="true" onInput={onInput} onPaste={pastePlain} /></div>;
}
