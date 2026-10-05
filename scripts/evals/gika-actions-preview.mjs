import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Writes only synthetic activities through the normal UI/command layer in isolated Preview.
const base = new URL(process.env.GIKA_EVAL_PREVIEW_URL ?? '');
if (base.protocol !== 'https:' || !/^leve-agenda-vercel-[a-z0-9]+-kauans-projects-6a261bab\.vercel\.app$/.test(base.hostname)) throw Error('ISOLATED_PREVIEW_REQUIRED');
const account = JSON.parse(readFileSync(process.env.GIKA_EVAL_ACCOUNT_FILE ?? '.cache/preflight/hosted/smoke-account.json', 'utf8'));
if (account.project !== 'leve-preview') throw Error('PREVIEW_ACCOUNT_REQUIRED');
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyUrl ? new URL(proxyUrl) : null;
const browser = await chromium.launch(proxy ? { proxy: { server: `${proxy.protocol}//${proxy.host}`, ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {});
const page = await browser.newPage();
const evidence = { sha: process.env.GIKA_EVAL_SHA, preview: base.href, results: [] };
let step = 'login';
let lastRequest = 0;
let audienceVerified = false;
async function ask(text) {
  const remaining = 10_500 - (Date.now() - lastRequest);
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api/gika/respond' && response.request().method() === 'POST');
  lastRequest = Date.now();
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill(text); await input.press('Enter');
  const response = await pending;
  const body = await response.json();
  if (response.status() !== 200) {
    evidence.results.push({ step, result: 'FAIL', status: response.status(), code: body.code, correlationId: body.correlationId });
    throw Error('GIKA_REQUEST_FAILED');
  }
  expect(body.simulated).toBe(false);
  return body;
}
try {
  await page.goto(new URL('/entrar', base).href);
  if (new URL(page.url()).origin !== base.origin) throw Error('PREVIEW_ACCESS_REQUIRED');
  const pending = page.waitForResponse(response => response.url().includes('identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'));
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  const auth = await (await pending).json();
  audienceVerified = Boolean(auth.idToken && JSON.parse(Buffer.from(auth.idToken.split('.')[1], 'base64url')).aud === 'leve-preview');
  if (!audienceVerified) throw Error('PREVIEW_AUDIENCE_REQUIRED');
  await expect(page.getByRole('heading', { name: 'Meu dia', exact: true })).toBeVisible();
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  step = 'read';
  expect((await ask('Como tá minha agenda hoje?')).reads.length).toBeGreaterThan(0);
  evidence.results.push({ step, result: 'PASS' });
  step = 'create';
  const title = `Avaliação Gika ${Date.now()}`;
  const create = await ask(`Coloca na minha agenda hoje uma tarefa chamada "${title}"`);
  expect(create.createTask.title).toBe(title);
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toContainText(title);
  evidence.results.push({ step, result: 'PASS' });
  step = 'confirmation';
  const move = await ask('Então põe essa tarefa amanhã às sete da noite');
  expect(move.confirmation.policy.kind).toBe('confirm');
  expect(move.confirmation.action.kind).toBe('reschedule_task');
  expect(move.confirmation.action.task.patch.dueTime).toBe('19:00');
  expect(move.confirmation.token).toMatch(/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  const preview = page.getByRole('group', { name: 'Prévia de reagendamento', exact: true });
  const pendingCommand = page.waitForResponse(response => new URL(response.url()).pathname === '/api/commands' && response.request().postDataJSON()?.gikaReschedule);
  await preview.getByRole('button', { name: 'Mover tarefa', exact: true }).click();
  const command = await pendingCommand;
  const envelope = command.request().postDataJSON();
  const ack = await command.json();
  expect(command.status()).toBe(200);
  expect(ack.result).toBe('applied');
  expect(ack.entityId).toBe(move.confirmation.action.task.id);
  expect(ack.revision).toBe(move.confirmation.action.task.revision + 1);
  expect(ack.operationId).toBe(envelope.operationId);
  expect(envelope.expectedRevision).toBe(move.confirmation.action.task.revision);
  expect(envelope.gikaReschedule.confirmationToken).toBe(move.confirmation.token);
  expect(envelope.payload).toEqual(move.confirmation.action.task.patch);
  await expect(page.getByRole('group', { name: 'Tarefa reagendada', exact: true })).toContainText(title);
  evidence.results.push({ step, result: 'PASS' });
  step = 'complete-followup';
  const complete = await ask('Já terminei essa tarefa, marca como concluída');
  expect(complete.completeTask.id).toBe(ack.entityId);
  expect(complete.completeTask.revision).toBe(ack.revision);
  await expect(page.getByRole('group', { name: 'Tarefa concluída', exact: true })).toContainText(title);
  evidence.results.push({ step, result: 'PASS' });
} catch (error) {
  if (!evidence.results.some(item => item.step === step && item.result === 'FAIL')) evidence.results.push({ step, result: 'FAIL', errorClass: error.name });
  process.exitCode = 1;
} finally {
  evidence.previewAudienceVerified = audienceVerified;
  mkdirSync('.cache/gika-assistant', { recursive: true });
  writeFileSync('.cache/gika-assistant/live-actions.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
}
