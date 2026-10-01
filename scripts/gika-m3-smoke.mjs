// Opt-in live smoke. Start with NODE_USE_ENV_PROXY=1; supply a current authorized
// Free Tier key through stdin with terminal echo disabled, never argv or a file.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';
import { Temporal } from '@js-temporal/polyfill';

if (process.env.GEMINI_API_KEY !== undefined) {
  console.error('BLOCKED: supply credential only through stdin');
  process.exit(2);
}
assert.equal(process.env.NODE_USE_ENV_PROXY, '1', 'Remote egress must be enabled only in the test process');
Object.assign(process.env, { FIREBASE_PROJECT_ID: 'demo-leve', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099', FIRESTORE_EMULATOR_HOST: 'localhost:8080', LOG_LEVEL: 'error' });
const input = createInterface({ input: process.stdin, terminal: false });
console.log('READY: awaiting authorized credential on stdin; no echo');
const [line] = await once(input, 'line');
process.env.GEMINI_API_KEY = line.trim();
input.close();
const evidence = { checkpoint: 'abbd1e2', project: 'demo-leve', model: 'gemini-3.5-flash-lite', thinking: 'medium', proxyEnvironmentOnly: true, provider: [], result: 'FAIL' };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  if (String(args[0]).startsWith('https://generativelanguage.googleapis.com/')) {
    try {
      const response = await originalFetch(...args);
      const body = await response.clone().json().catch(() => null);
      evidence.provider.push({ http: response.status, tools: body?.candidates?.flatMap(c => c.content?.parts?.filter(p => p.functionCall).map(p => ['get_today', 'get_day', 'get_week', 'create_task'].includes(p.functionCall.name) ? p.functionCall.name : 'UNKNOWN_TOOL') ?? []) ?? [], ...(response.ok ? {} : { status: body?.error?.status ?? 'UNKNOWN', reasons: body?.error?.details?.flatMap(d => typeof d.reason === 'string' ? [d.reason] : []) ?? [] }) });
      return response;
    } catch {
      evidence.provider.push({ category: 'NETWORK_OR_TIMEOUT' });
      throw new Error('SANITIZED_PROVIDER_NETWORK_FAILURE');
    }
  }
  return originalFetch(...args);
};
let server, browser;
let stage = 'STARTUP';
try {
  const { app } = await import('../server/app.ts');
  const { auth, db } = await import('../server/platform/firebase.ts');
  const user = await auth.getUserByEmail('leve.local@example.test');
  const profile = (await db.doc(`users/${user.uid}`).get()).data();
  assert.equal(profile.timeZone, 'America/Sao_Paulo');
  server = app.listen(8789, '127.0.0.1'); await once(server, 'listening');
  browser = await chromium.launch({ env: Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'GEMINI_API_KEY')) });
  const page = await browser.newPage({ baseURL: 'http://localhost:5174', reducedMotion: 'reduce' });
  // Environment forwarding only; production UI/API/provider and command code unchanged.
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:8789${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto('/entrar');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) { const ack = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'profile.completeTutorial'); await skip.click(); await ack; }
  const title = 'Teste Gika M3';
  const dueDate = Temporal.Now.instant().toZonedDateTimeISO(profile.timeZone).toPlainDate().add({ days: 1 }).toString();
  const before = await db.collection(`users/${user.uid}/activities`).get();
  const unchanged = new Map(before.docs.map(d => [d.id, JSON.stringify(d.data())]));
  assert.equal(before.docs.filter(d => d.data().title === title).length, 0);
  const requests = [], commands = [], acks = [], interpretations = [];
  page.on('request', r => { if (r.url().endsWith('/api/gika/respond')) requests.push(r.postDataJSON().requestId); });
  page.on('response', async r => { if (r.url().endsWith('/api/gika/respond') && r.status() === 200) interpretations.push(await r.json()); });
  let committed = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/commands', async route => {
    const command = route.request().postDataJSON(); commands.push(command);
    assert.equal(command.command, 'activity.create');
    const response = await route.fetch({ url: 'http://127.0.0.1:8789/api/commands' });
    assert.equal(response.status(), 200); acks.push(await response.json());
    if (commands.length === 1) { committed = true; await gate; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  stage = 'LIVE_CREATE';
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill(`Adiciona ${title} amanhã`); await question.press('Enter');
  await expect.poll(() => committed, { timeout: 20000 }).toBe(true);
  const card = page.getByRole('group', { name: 'Tarefa adicionada', exact: true });
  await expect(card).toHaveCount(0);
  const entityId = commands[0].entityId;
  const created = await db.doc(`users/${user.uid}/activities/${entityId}`).get();
  assert.equal(created.data().title, title); assert.equal(created.data().schedule.dueDate, dueDate);
  assert.equal(created.data().revision, 1); assert.equal(created.data().schedule.type, 'task');
  assert.equal(acks[0].entityId, entityId); assert.equal(commands[0].operationId, requests[0]);
  evidence.uiNoSuccessBeforeAck = true;
  release(); await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(card).toHaveCount(0);
  stage = 'RETRY';
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(card).toContainText(title); await expect(card).toContainText(dueDate.split('-').reverse().join('/'));
  assert.equal(requests.length, 2); assert.equal(requests[0], requests[1]);
  assert.deepEqual(commands.map(c => c.operationId), requests);
  assert.deepEqual(acks.map(a => a.result), ['applied', 'alreadyApplied']);
  assert.equal(acks[1].entityId, entityId);
  assert.equal(interpretations.length, 2);
  for (const result of interpretations) { assert.equal(result.createTask.title, title); assert.equal(result.createTask.dueDate, dueDate); assert.deepEqual(result.reads, []); }
  assert.equal(evidence.provider.length, 1); assert.equal(evidence.provider[0].http, 200); assert.deepEqual(evidence.provider[0].tools, ['create_task']);
  const after = await db.collection(`users/${user.uid}/activities`).get();
  assert.equal(after.size, before.size + 1); assert.equal(after.docs.filter(d => d.data().title === title).length, 1);
  for (const d of after.docs) if (d.id !== entityId) assert.equal(JSON.stringify(d.data()), unchanged.get(d.id));
  const receipt = (await db.doc(`commandReceipts/${user.uid}_${requests[0]}`).get()).data();
  assert.equal(receipt.response.entityId, entityId); assert.equal(receipt.gika.task.title, title);
  evidence.creation = { title, dueDate, timeZone: profile.timeZone, count: 1, entityMatchesStructuredAck: true, receipt: true, results: acks.map(a => a.result), technicalRetrySameIdentity: true, upstreamCalls: 1, otherEntitiesUnchanged: true, commands: ['activity.create', 'activity.create'] };
  await page.screenshot({ path: '/tmp/leve-m3-smoke-created.png' });
  stage = 'UNDO';
  await page.unroute('**/api/commands');
  const undoAck = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'activity.trash');
  await card.getByRole('button', { name: 'Desfazer', exact: true }).click();
  const undo = await undoAck; assert.equal(undo.status(), 200); assert.equal((await undo.json()).entityId, entityId);
  await expect(card).toContainText('Criação desfeita.');
  const removed = (await db.doc(`users/${user.uid}/activities/${entityId}`).get()).data();
  assert.ok(removed.deletedAt); assert.equal(removed.revision, 2); assert.equal(evidence.provider.length, 1);
  const final = await db.collection(`users/${user.uid}/activities`).get();
  for (const d of final.docs) if (d.id !== entityId) assert.equal(JSON.stringify(d.data()), unchanged.get(d.id));
  evidence.undo = { command: 'activity.trash', ack: 'applied', revision: 2, exactTargetSoftDeleted: true, otherEntitiesUnchanged: true, additionalGeminiCalls: 0 };
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(0);
  evidence.result = 'PASS';
} catch {
  // Deliberately never serialize errors, tokens, headers, bodies, traces or secrets.
  evidence.failure = { stage, category: evidence.provider.some(p => p.http && p.http !== 200) ? 'PROVIDER_HTTP' : evidence.provider.some(p => p.category) ? 'NETWORK_OR_TIMEOUT' : 'ASSERTION_OR_LOCAL_ENVIRONMENT' };
  process.exitCode = 1;
} finally {
  delete process.env.GEMINI_API_KEY;
  globalThis.fetch = originalFetch;
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await writeFile('docs/gika/evidence/m3-smoke.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(`${evidence.result}: M3-SMOKE; sanitized evidence only; credential removed`);
  process.exit(process.exitCode ?? 0);
}
