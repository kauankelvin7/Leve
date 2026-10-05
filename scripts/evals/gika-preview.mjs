import { chromium, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Temporal } from '@js-temporal/polyfill';
import { cases } from './gika-cases.mjs';

// Explicitly Preview-only. Never print prompts, model replies, credentials or authorization.
const base = new URL(process.env.GIKA_EVAL_PREVIEW_URL ?? '');
if (base.protocol !== 'https:' || !/^leve-agenda-vercel-[a-z0-9]+-kauans-projects-6a261bab\.vercel\.app$/.test(base.hostname)) throw Error('ISOLATED_PREVIEW_REQUIRED');
const account = JSON.parse(readFileSync(process.env.GIKA_EVAL_ACCOUNT_FILE ?? '.cache/preflight/hosted/smoke-account.json', 'utf8'));
if (account.project !== 'leve-preview') throw Error('PREVIEW_ACCOUNT_REQUIRED');
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyUrl ? new URL(proxyUrl) : null;
const browser = await chromium.launch(proxy ? { proxy: { server: `${proxy.protocol}//${proxy.host}`, ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {});
const page = await browser.newPage();
let token;
const evidence = [];
try {
  await page.goto(new URL('/entrar', base).href);
  if (new URL(page.url()).origin !== base.origin) throw Error('PREVIEW_ACCESS_REQUIRED');
  const identity = page.waitForResponse(response => response.url().includes('identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'));
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const auth = await (await identity).json();
  token = auth.idToken;
  if (!token || JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).aud !== 'leve-preview') throw Error('PREVIEW_AUDIENCE_REQUIRED');
  await expect(page.getByRole('heading', { name: 'Meu dia', exact: true })).toBeVisible();
  for (const item of cases) {
    if (evidence.length) await new Promise(resolve => setTimeout(resolve, 10_500));
    const started = Date.now();
    const response = await page.evaluate(async ({ token, text, conversation }) => {
      const response = await fetch('/api/gika/respond', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: crypto.randomUUID(), text, ...(conversation ? { conversation } : {}) }) });
      return { status: response.status, body: await response.json() };
    }, { token, text: item.text, conversation: item.conversation });
    const { body, status } = response;
    const effect = body.createTask || body.completeTask || body.updateTask || body.rescheduleTask || body.batchConfirmation || body.recurrenceConfirmation;
    let pass = status === 200 && body.simulated === false;
    const tomorrow = Temporal.Now.plainDateISO('America/Sao_Paulo').add({ days: 1 }).toString();
    const titleKey = text => text?.trim().toLocaleLowerCase('pt-BR');
    if (item.kind === 'create') pass &&= Boolean(body.createTask && titleKey(body.createTask.title) === titleKey(item.title) && body.createTask.dueDate === tomorrow && body.createTask.dueTime === item.time);
    if (item.kind === 'read') pass &&= Boolean(body.reads?.length && !effect);
    if (item.kind === 'outside') pass &&= body.domainIntent === 'OUT_OF_SCOPE' && !effect && body.reads?.length === 0;
    if (['conversation', 'clarify', 'no-effect'].includes(item.kind)) pass &&= !effect && body.reads?.length === 0 && typeof body.text === 'string';
    evidence.push({ id: item.id, kind: item.kind, status, result: pass ? 'PASS' : 'FAIL', durationMs: Date.now() - started,
      ...(body.correlationId ? { correlationId: body.correlationId } : {}), ...(body.code ? { code: body.code } : {}) });
    console.log(JSON.stringify(evidence.at(-1)));
  }
} finally {
  token = undefined;
  mkdirSync('.cache/gika-assistant', { recursive: true });
  writeFileSync('.cache/gika-assistant/live-eval.json', JSON.stringify({ preview: base.href, results: evidence }, null, 2));
  await browser.close();
}
if (evidence.length !== cases.length || evidence.some(item => item.result !== 'PASS')) process.exitCode = 1;
