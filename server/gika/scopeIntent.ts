import { GikaFault } from './model.ts';
export type ProposedScope = 'occurrence' | 'future' | 'all';
// Scope evidence is interpreted outside quoted titles. It is never an authorization:
// target inspection, strict effect schema and deterministic policy still decide execution.
const markers: [RegExp, ProposedScope][] = [
  [/\b(?:s[oó] hoje|apenas essa|s[oó] esta|somente esta ocorr[eê]ncia|essa ocorr[eê]ncia|esta ocorr[eê]ncia)\b/giu, 'occurrence'],
  [/\b(?:daqui pra frente|daqui para frente|todas as pr[oó]ximas|esta e as pr[oó]ximas)\b/giu, 'future'],
  [/\b(?:a s[eé]rie inteira|toda a s[eé]rie|todas|todos)\b/giu, 'all'],
];
export function scopedIntent(text: string, proposal: { recurrenceScope?: ProposedScope }) {
  const quotes: Record<string, string> = { '"': '"', "'": "'", '“': '”', '‘': '’' };
  let closing: string | undefined;
  const visible = text.split('').map((char, index) => {
    if (closing) { if (char === closing) closing = undefined; return ' '; }
    if (quotes[char] && (index === 0 || /\s/.test(text[index - 1]!))) { closing = quotes[char]; return ' '; }
    return char;
  }).join('');
  const matches: { start: number; end: number; scope: ProposedScope }[] = [];
  for (const [expression, scope] of markers) for (const match of visible.matchAll(expression)) matches.push({ start: match.index!, end: match.index! + match[0].length, scope });
  // Prefer a whole phrase to a contained word ("todas as próximas" is not "todas").
  const exact = matches.filter(match => !matches.some(other => other !== match && other.start <= match.start && other.end >= match.end && other.end - other.start > match.end - match.start));
  const scopes = new Set(exact.map(match => match.scope));
  if (scopes.size > 1 || (proposal.recurrenceScope && !scopes.has(proposal.recurrenceScope))) throw new GikaFault('GIKA_POLICY');
  const scope = exact[0]?.scope;
  let clean = text;
  for (const match of exact.sort((a, b) => b.start - a.start)) {
    // Remove punctuation belonging to the scope clause, preserving quoted title text.
    const before = clean.slice(0, match.start).replace(/,\s*$/u, ' ');
    const after = clean.slice(match.end).replace(/^\s*,/u, ' ');
    clean = before + after;
  }
  clean = clean.trim();
  return { text: clean, scope };
}
