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
const evidence = { checkpoint: 'cfd96c3', project: 'demo-leve', model: 'gemini-3.5-flash-lite', thinking: 'medium', proxyEnvironmentOnly: true, provider: [], result: 'FAIL' };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  if (String(args[0]).startsWith('https://generativelanguage.googleapis.com/')) {
    try {
      const response = await originalFetch(...args);
      const body = await response.clone().json().catch(() => null);
      evidence.provider.push({ http: response.status, identityFieldsAbsent: !JSON.stringify(body?.candidates?.flatMap(c => c.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall.args) ?? []) ?? []).match(/"(?:uid|UID|activityId|entityId|revision|operationId|receipt|requestId)"\s*:/), tools: body?.candidates?.flatMap(c => c.content?.parts?.filter(p => p.functionCall).map(p => ['complete_task', 'update_task', 'reschedule_task'].includes(p.functionCall.name) ? p.functionCall.name : 'UNKNOWN_TOOL') ?? []) ?? [], ...(response.ok ? {} : { status: body?.error?.status ?? 'UNKNOWN', reasons: body?.error?.details?.flatMap(d => typeof d.reason === 'string' ? [d.reason] : []) ?? [] }) });
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
  const { scheduleInstants } = await import('../packages/domain/src/content.ts');
  const { auth, db } = await import('../server/platform/firebase.ts');
  const observer = await auth.getUserByEmail('leve.local@example.test');
  const observerBefore = await db.collection(`users/${observer.uid}/activities`).get();
  const observerSnapshot = observerBefore.docs.map(d => [d.id, JSON.stringify(d.data())]);
  const profile = (await db.doc(`users/${observer.uid}`).get()).data();
  assert.equal(profile.timeZone, 'America/Sao_Paulo');
  const email = `gika-m4-smoke-${crypto.randomUUID()}@example.test`, password = 'smoke-local-123';
  const user = await auth.createUser({ email, password, emailVerified: true, displayName: 'Teste Gika' });
  await db.doc(`users/${user.uid}`).set({ ...profile, uid: user.uid, email, displayName: 'Teste Gika' });
  const membership = (await db.doc(`memberships/${observer.uid}`).get()).data();
  await db.doc(`memberships/${user.uid}`).set({ ...membership, uid: user.uid });
  server = app.listen(8789, '127.0.0.1'); await once(server, 'listening');
  browser = await chromium.launch({ env: Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'GEMINI_API_KEY')) });
  const page = await browser.newPage({ baseURL: 'http://localhost:5174', reducedMotion: 'reduce' });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:8789${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.goto('/entrar');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const today = Temporal.Now.instant().toZonedDateTimeISO(profile.timeZone).toPlainDate().toString();
  const tomorrow = Temporal.PlainDate.from(today).add({ days: 1 }).toString();
  const cases = [
    { tool: 'complete_task', title: 'Teste Gika Complete M4', question: 'Terminei Teste Gika Complete M4', card: 'Tarefa concluída', descriptor: 'completeTask', time: null, tag: 'gikaCompletion' },
    { tool: 'update_task', title: 'Teste Gika Rename M4', question: 'Renomeia "Teste Gika Rename M4" para "Teste Gika Renomeado M4"', card: 'Tarefa atualizada', descriptor: 'updateTask', time: '14:15', tag: 'gikaUpdate' },
    { tool: 'reschedule_task', title: 'Teste Gika Move M4', question: 'Move "Teste Gika Move M4" para amanhã', card: 'Tarefa reagendada', descriptor: 'rescheduleTask', time: '19:00', tag: 'gikaReschedule' },
    { tool: 'reschedule_task', title: 'Teste Gika Move Sem Horário M4', question: 'Move "Teste Gika Move Sem Horário M4" para amanhã', card: 'Tarefa reagendada', descriptor: 'rescheduleTask', time: null, tag: 'gikaReschedule' },
  ];
  const ref = id => db.doc(`users/${user.uid}/activities/${id}`);
  for (const item of cases) {
    item.id = await page.evaluate(async value => {
      const path = '/src/platform/api.ts'; const { sendCommand } = await import(/* @vite-ignore */ path); const id = crypto.randomUUID();
      const ack = await sendCommand({ command: 'activity.create', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: value });
      if (ack.entityId !== id || ack.revision !== 1) throw Error('Fixture command failed'); return id;
    }, { title: item.title, descriptionPlain: 'Nota sintética para preservar', categoryId: null, colorHex: '#65A885', estimatedMinutes: 35, reminderSpecs: [], schedule: { type: 'task', dueDate: today, dueTime: item.time, timeZone: profile.timeZone, disambiguation: 'reject' } });
    item.before = (await ref(item.id).get()).data();
  }
  const allBefore = new Map(cases.map(c => [c.id, JSON.stringify(c.before)]));
  evidence.scenarios = [];
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  for (const [index, item] of cases.entries()) {
    if (index === 3) {
      // Respect the unchanged three-per-minute limiter; never relax product limits.
      const remaining = 60000 - Date.now() % 60000 + 100;
      await page.waitForTimeout(remaining);
    }
    stage = `LIVE_${item.tool}_${index}`;
    const callsBefore = evidence.provider.length;
    const requests = [], commands = [], acks = [], interpretations = [];
    let committed = false, release;
    const gate = new Promise(resolve => { release = resolve; });
    const onRequest = r => { if (r.url().endsWith('/api/gika/respond')) requests.push(r.postDataJSON().requestId); };
    page.on('request', onRequest);
    await page.route('**/api/gika/respond', async route => {
      const response = await route.fetch({ url: 'http://127.0.0.1:8789/api/gika/respond' });
      assert.equal(response.status(), 200); interpretations.push(await response.json());
      await route.fulfill({ response });
    });
    await page.route('**/api/commands', async route => {
      const c = route.request().postDataJSON(); commands.push(c);
      assert.equal(c.command, item.tool === 'complete_task' ? 'activity.setStatus' : 'activity.update');
      assert.equal(c.entityId, item.id); assert.equal(c.expectedRevision, 1); assert.ok(c[item.tag]);
      assert.deepEqual(c.payload, item.tool === 'complete_task' ? { status: 'completed' } : item.tool === 'update_task' ? { title: 'Teste Gika Renomeado M4' } : { dueDate: tomorrow });
      const response = await route.fetch({ url: 'http://127.0.0.1:8789/api/commands' });
      assert.equal(response.status(), 200); acks.push(await response.json());
      if (commands.length === 1) { committed = true; await gate; await route.abort('failed'); }
      else await route.fulfill({ response });
    });
    await question.fill(item.question); await question.press('Enter');
    const card = page.getByRole('group', { name: item.card, exact: true });
    const currentCard = card.filter({ hasText: item.tool === 'update_task' ? 'Teste Gika Renomeado M4' : item.title });
    if (item.tool === 'reschedule_task') {
      const preview = page.getByRole('group', { name: 'Prévia de reagendamento', exact: true }).filter({ hasText: item.title });
      await expect(preview).toContainText(tomorrow.split('-').reverse().join('/'), { timeout: 20000 });
      assert.equal(commands.length, 0); assert.equal(JSON.stringify((await ref(item.id).get()).data()), allBefore.get(item.id));
      assert.equal((await db.doc(`commandReceipts/${user.uid}_${requests[0]}`).get()).exists, false);
      assert.equal(interpretations[0].rescheduleTask.id, item.id);
      assert.equal(interpretations[0].rescheduleTask.dueTime, item.time);
      const button = preview.getByRole('button', { name: 'Mover tarefa', exact: true });
      const handle = await button.elementHandle(); await button.click(); await handle.dispatchEvent('click');
    }
    await expect.poll(() => committed, { timeout: 20000 }).toBe(true);
    await expect(currentCard).toHaveCount(0);
    const afterCommit = (await ref(item.id).get()).data();
    assert.equal(afterCommit.revision, 2);
    const comparable = { ...afterCommit, revision: item.before.revision, updatedAt: item.before.updatedAt };
    if (item.tool === 'complete_task') { assert.equal(afterCommit.status, 'completed'); assert.ok(afterCommit.completedAt); comparable.status = item.before.status; comparable.completedAt = item.before.completedAt; }
    if (item.tool === 'update_task') { assert.equal(afterCommit.title, 'Teste Gika Renomeado M4'); comparable.title = item.before.title; }
    if (item.tool === 'reschedule_task') { assert.equal(afterCommit.schedule.dueDate, tomorrow); assert.equal(afterCommit.schedule.dueTime, item.time); assert.deepEqual(afterCommit.schedule, { ...item.before.schedule, dueDate: tomorrow }); assert.equal(afterCommit.dueAt, scheduleInstants(afterCommit.schedule).dueAt); comparable.schedule = item.before.schedule; comparable.dueAt = item.before.dueAt; }
    assert.deepEqual(comparable, item.before);
    assert.equal(commands.length, 1); release();
    const retry = page.getByRole('button', { name: item.tool === 'reschedule_task' ? 'Tentar mover novamente' : 'Tentar novamente', exact: true });
    await expect(retry).toBeVisible(); await expect(currentCard).toHaveCount(0);
    stage = `RETRY_${item.tool}_${index}`; await retry.click();
    await expect(currentCard).toContainText(item.tool === 'update_task' ? 'Teste Gika Renomeado M4' : item.title);
    assert.equal(commands.length, 2); assert.deepEqual(commands[0], commands[1]);
    assert.deepEqual(acks.map(a => a.result), ['applied', 'alreadyApplied']);
    for (const a of acks) { assert.equal(a.entityId, item.id); assert.equal(a.revision, 2); assert.equal(a.operationId, requests[0]); }
    assert.equal(commands[0].operationId, requests[0]);
    assert.equal(JSON.stringify((await ref(item.id).get()).data()), JSON.stringify(afterCommit));
    assert.equal(interpretations[0][item.descriptor].id, item.id);
    const receipt = (await db.doc(`commandReceipts/${user.uid}_${requests[0]}`).get()).data();
    assert.equal(receipt.response.entityId, item.id); assert.equal(receipt[item.tag].task.id, item.id);
    assert.equal(evidence.provider.length, callsBefore + 1);
    const upstream = evidence.provider.at(-1); assert.equal(upstream.http, 200); assert.deepEqual(upstream.tools, [item.tool]); assert.equal(upstream.identityFieldsAbsent, true);
    const all = await db.collection(`users/${user.uid}/activities`).get(); assert.equal(all.size, 4);
    for (const d of all.docs) if (d.id !== item.id) assert.equal(JSON.stringify(d.data()), allBefore.get(d.id));
    allBefore.set(item.id, JSON.stringify(afterCommit));
    evidence.scenarios.push({ tool: item.tool, title: item.title, today, destination: item.tool === 'reschedule_task' ? tomorrow : null, originalTime: item.time, targetMatchesStructuredResultAndAck: true, patchOnly: true, revision: 2, receipt: true, results: ['applied', 'alreadyApplied'], sameRetryIdentity: true, uiNoSuccessBeforeAck: true, noWriteBeforePreviewConfirmation: item.tool === 'reschedule_task' ? true : null, doubleTapSingleDispatch: item.tool === 'reschedule_task' ? true : null, otherEntitiesUnchanged: true, additionalGeminiCallsOnRetry: 0 });
    await page.screenshot({ path: `/tmp/leve-m4-smoke-${index}.png` });
    await page.unroute('**/api/commands'); await page.unroute('**/api/gika/respond'); page.off('request', onRequest);
    console.log(`PASS: ${item.tool}; ack, receipt, retry, UI verified`);
  }
  stage = 'ISOLATION_AND_MISSING_PROVIDER';
  const observerAfter = await db.collection(`users/${observer.uid}/activities`).get();
  assert.deepEqual(observerAfter.docs.map(d => [d.id, JSON.stringify(d.data())]), observerSnapshot);
  const upstreamCount = evidence.provider.length; delete process.env.GEMINI_API_KEY;
  await question.fill('O que tenho hoje?'); await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible({ timeout: 20000 });
  assert.equal(evidence.provider.length, upstreamCount);
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.goto(`/hoje?dia=${tomorrow}`); await expect(page.locator('.day-activity').filter({ hasText: 'Teste Gika Move M4' })).toHaveCount(1);
  await expect(page.locator('.day-activity').filter({ hasText: 'Teste Gika Move Sem Horário M4' })).toHaveCount(1);
  evidence.otherUidUnchanged = true; evidence.missingProviderGracefulAndAgendaAvailable = true;
  evidence.onlyPermittedCommands = true; evidence.testOnlyAccountAndEmulators = true;
  evidence.result = 'PASS';
} catch {
  evidence.failure = { stage, category: evidence.provider.some(p => p.http && p.http !== 200) ? 'PROVIDER_HTTP' : evidence.provider.some(p => p.category) ? 'NETWORK_OR_TIMEOUT' : 'ASSERTION_OR_LOCAL_ENVIRONMENT' };
  process.exitCode = 1;
} finally {
  delete process.env.GEMINI_API_KEY; globalThis.fetch = originalFetch;
  await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));
  await writeFile('docs/gika/evidence/m4-smoke.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(`${evidence.result}: M4-SMOKE; sanitized evidence only; credential removed`);
  process.exit(process.exitCode ?? 0);
}
