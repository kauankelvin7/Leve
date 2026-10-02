import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';

// Reuse the parser already installed by eslint-plugin-react-hooks; no new dependency.
const roots = ['server/gika', 'apps/web/src/features/gika'];
let files = 0;
let violations = 0;
for (const root of roots) for (const path of readdirSync(root, { recursive: true }).filter(path => /\.tsx?$/.test(path))) {
  const file = `${root}/${path.replaceAll('\\', '/')}`;
  const ast = parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  files++;
  const check = (source, names = []) => {
    if (typeof source !== 'string') {
      console.error(`${file}: runtime import must have a static module path`); violations++; return;
    }
    source = source.replaceAll('\\', '/');
    const persistence = /^(?:firebase(?:-admin)?(?:$|\/(?:compat\/)?firestore)|@firebase\/firestore|@google-cloud\/firestore)|(?:^|\/)commands(?:\/|(?:\.ts)?$)/.test(source);
    const firebasePlatform = /platform\/firebase(?:\.ts)?$/.test(source);
    const readOwner = ['server/gika/reads.ts', 'server/gika/batchGuard.ts'].includes(file);
    const conventionalRead = readOwner && names.length > 0 && ((source === '../platform/firebase.ts' && names.every(name => name === 'db')) || (source === '../commands/identity.ts' && names.every(name => name === 'commandHash')));
    const localOnly = /(?:^|\/)(?:proactivity\.ts|GikaSuggestion\.tsx|useVoiceInput\.ts)$/.test(file) || file.includes('/character/');
    const privateImport = localOnly && /firebase|(?:^|\/)(?:api|model|gemini|.*Adapter|.*Bridge)(?:\.tsx?)?$|commands/i.test(source);
    if ((!conventionalRead && (persistence || (firebasePlatform && (!names.length || names.some(name => name !== 'firebaseAuth'))))) || privateImport) {
      console.error(`${file}: forbidden runtime import ${source}`); violations++;
    }
  };
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source && node.importKind !== 'type' && node.exportKind !== 'type') {
      const specifiers = (node.specifiers ?? []).filter(specifier => specifier.importKind !== 'type');
      if (!node.specifiers?.length || specifiers.length) check(node.source.value, specifiers.map(specifier => specifier.imported?.name ?? '*'));
    }
    if (node.type === 'CallExpression' && ['import', 'require'].includes(node.callee.type === 'Import' ? 'import' : node.callee.name)) check(node.arguments[0]?.type === 'StringLiteral' ? node.arguments[0].value : undefined, ['*']);
    if (node.type === 'ImportExpression') check(node.source.type === 'StringLiteral' ? node.source.value : undefined, ['*']);
    for (const [key, value] of Object.entries(node)) if (key !== 'loc') {
      if (Array.isArray(value)) value.forEach(visit); else if (value?.type) visit(value);
    }
  };
  visit(ast.program);
}
if (violations) process.exitCode = 1;
else console.log(`Architecture boundaries PASS (${files} TypeScript sources).`);
