import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export function checkCss(css, file, { primitive = false, complete = false, variables = {} } = {}) {
  const errors = [];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*([^;}]+)/g)) {
    const value = match[1].trim();
    if (value === 'none') continue;
    const blurs = [...value.matchAll(/blur\((var\(--[\w-]+\)|[^)]*)\)/g)];
    if (!blurs.length) errors.push(`${file}: UNMEASURED_BLUR: ${value}`);
    for (const blur of blurs) {
      const argument = blur[1].trim();
      const token = argument.match(/^var\((--[\w-]+)\)$/)?.[1];
      const values = token ? variables[token] : [argument];
      if (!values?.length || values.some(v => !/^[\d.]+px$/.test(v))) errors.push(`${file}: UNMEASURED_BLUR: ${value}`);
      else if (values.some(v => Number.parseFloat(v) > 24)) errors.push(`${file}: MAX_BLUR_24: ${value}`);
    }
    if (complete && !primitive && !file.includes('/dev/')) errors.push(`${file}: FILTER_NOT_CENTRALIZED: ${value}`);
  }
  if (primitive) for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const standard = block[2].match(/(?<!-)\bbackdrop-filter\s*:\s*([^;}]+)/)?.[1]?.trim();
    const webkit = block[2].match(/-webkit-backdrop-filter\s*:\s*([^;}]+)/)?.[1]?.trim();
    if (standard !== webkit && (standard || webkit)) errors.push(`${file}: FILTER_PAIR: ${block[1].trim()}`);
  }
  return errors;
}
export function lockRequired(exists, complete) { return !exists && complete; }
export function blurVariables(css) {
  const variables = {};
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) (variables[match[1]] ??= []).push(match[2].trim());
  return variables;
}
async function walk(root) {
  return (await Promise.all((await readdir(root, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(`${root}/${entry.name}`) : `${root}/${entry.name}`))).flat();
}
export async function check() {
  const errors = [];
  const manifestPath = process.env.GLASS_MANIFEST ?? 'glass.manifest.json';
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.version !== 1 || manifest.sourceRoot !== 'apps/web/src' || manifest.maxBlurPx !== 24 || manifest.primitive !== 'apps/web/src/styles/glass.css' || !Array.isArray(manifest.components)) throw Error('invalid contract');
    const ids = new Set();
    for (const c of manifest.components) {
      if (!['id', 'selector', 'variant', 'scope', 'reason'].every(k => typeof c[k] === 'string' && c[k].trim()) || ids.has(c.id)) throw Error('invalid component');
      ids.add(c.id);
    }
  } catch (error) { errors.push(`MANIFEST_INVALID: ${error.message}`); }
  const variables = blurVariables(await readFile('apps/web/src/styles/glass.css', 'utf8'));
  for (const [token, values] of Object.entries(variables)) if (/blur/i.test(token) && values.some(v => /^[\d.]+px$/.test(v) && Number.parseFloat(v) > 24)) errors.push(`MAX_BLUR_24: ${token}`);
  for (const file of await walk('apps/web/src')) if (file.endsWith('.css')) errors.push(...checkCss(await readFile(file, 'utf8'), file, { primitive: file === 'apps/web/src/styles/glass.css', complete: process.env.GLASS_COMPLETE === '1', variables }));
  const lockExists = await access('docs/glass/HARNESS_LOCK.json').then(() => true, () => false);
  if (lockRequired(lockExists, process.env.GLASS_COMPLETE === '1')) errors.push('LOCK_MISSING: docs/glass/HARNESS_LOCK.json');
  if (lockExists) try {
    const lock = JSON.parse(await readFile('docs/glass/HARNESS_LOCK.json', 'utf8'));
    if (lock.version !== 1 || !lock.files || !Object.keys(lock.files).length) throw Error('invalid lock');
    const required = [...await walk('scripts/glass'), 'playwright.glass.config.ts', 'reference/glass.css', manifestPath];
    for (const file of required) if (!lock.files[file]) errors.push(`LOCK_MISSING: ${file}`);
    for (const [file, expected] of Object.entries(lock.files)) {
      const actual = createHash('sha256').update(await readFile(file)).digest('hex');
      if (actual !== expected) errors.push(`LOCK_MISMATCH: ${file}`);
    }
  } catch (error) { errors.push(`LOCK_INVALID: ${error.message}`); }
  return errors;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const errors = await check();
  for (const error of errors) console.error(error);
  console.log(JSON.stringify({ gate: 'glass:check', errors: errors.length, maxBlurPx: 24 }));
  process.exitCode = errors.length ? 1 : 0;
}
