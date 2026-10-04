import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const args = process.argv.slice(2);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return excluded.has(entry.name) ? [] : walk(join(directory, entry.name));
    return /\.md$/i.test(entry.name) ? [join(directory, entry.name)] : [];
  });
}

function stripCode(text) {
  return text
    .replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

function slugify(heading) {
  return heading
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function anchorsFor(markdown) {
  const anchors = new Set();
  const counts = new Map();
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)?.[2];
    if (!heading) continue;
    const base = slugify(heading);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    anchors.add(n === 0 ? base : `${base}-${n}`);
  }
  for (const match of markdown.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) anchors.add(match[1]);
  return anchors;
}

function lineAt(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

function resolveTarget(source, raw) {
  const decoded = decodeURIComponent(raw.replace(/&amp;/g, '&'));
  const hashIndex = decoded.indexOf('#');
  const pathname = hashIndex < 0 ? decoded : decoded.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? '' : decoded.slice(hashIndex + 1);
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(pathname)) return null;
  const base = pathname ? resolve(dirname(source), pathname) : source;
  return { target: base, fragment: decodeURIComponent(fragment) };
}

function checkFile(file, issues) {
  const source = isAbsolute(file) ? resolve(file) : resolve(root, file);
  if (!existsSync(source)) {
    issues.push(`${file}: arquivo Markdown informado não existe`);
    return;
  }
  const original = readFileSync(source, 'utf8');
  const text = stripCode(original);

  const historicalRecord = /(^|\/)(?:archive\/|[^/]*(?:EVIDENCE|EXECPLAN|PREFLIGHT|SMOKE)|SECURITY-AUDIT\.md|REPORT\.md)/i.test(source.slice(root.length + 1));
  if (!historicalRecord) {
    for (const match of original.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g)) {
      if (!scripts.has(match[1])) issues.push(`${source}:${lineAt(original, match.index)}: npm run ${match[1]} não existe em package.json`);
    }
  }

  const links = [];
  for (const match of text.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g)) {
    links.push({ raw: match[1] ?? match[2], offset: match.index });
  }
  for (const match of text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    links.push({ raw: match[1], offset: match.index });
  }

  for (const link of links) {
    let resolved;
    try {
      resolved = resolveTarget(source, link.raw);
    } catch {
      issues.push(`${source}:${lineAt(text, link.offset)}: link tem codificação inválida: ${link.raw}`);
      continue;
    }
    if (!resolved) continue;
    const { target, fragment } = resolved;
    if (!existsSync(target)) {
      issues.push(`${source}:${lineAt(text, link.offset)}: destino ausente: ${link.raw}`);
      continue;
    }
    if (statSync(target).isDirectory()) {
      if (fragment) issues.push(`${source}:${lineAt(text, link.offset)}: diretório não tem âncora Markdown: ${link.raw}`);
      continue;
    }
    if (fragment && extname(target).toLowerCase() === '.md') {
      const anchors = anchorsFor(readFileSync(target, 'utf8'));
      if (!anchors.has(fragment)) issues.push(`${source}:${lineAt(text, link.offset)}: âncora ausente em ${normalize(target)}: #${fragment}`);
    }
  }
}

let files;
if (args.length) files = args;
else {
  files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter((file) => /\.md$/i.test(file) && existsSync(join(root, file)));
  // Also include untracked Markdown beneath the working tree in case a Git version omits it.
  for (const file of walk(root)) {
    const relative = file.slice(root.length + 1);
    if (!files.includes(relative)) files.push(relative);
  }
}

const issues = [];
for (const file of files) checkFile(file, issues);
if (issues.length) {
  process.stderr.write(`${issues.join('\n')}\n`);
  process.stderr.write(`Falha: ${issues.length} problema(s) de links, âncoras ou scripts em ${files.length} arquivo(s) Markdown.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`OK: ${files.length} arquivo(s) Markdown; links locais, âncoras em Markdown e referências npm run fora de registros históricos verificadas. Links externos, sintaxe de referência Markdown, comandos em registros históricos e âncoras de alvos não Markdown não são validados.\n`);
}
