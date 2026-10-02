import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';
import { batchTestDb, batchTask, batchReceipt, batchTestPayload } from '../helpers/gikaBatch';
import { batchOperationId, batchPlanSchema, type BatchConfirmation } from '../../packages/domain/src/gikaBatch';
import { issueBatchConfirmation } from '../../server/gika/confirmation';

async function enter(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia'); const skip = page.getByRole('button', { name: 'Pular guia', exact: true }); await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined); if (await skip.isVisible()) await skip.click();
}
async function command(page: Page, value: unknown) { await page.evaluate(async value => { const path = '/src/platform/api.ts'; await (await import(/* @vite-ignore */path)).sendCommand(value); }, value); }
async function prepare(page: Page) {
  let modelTraffic = 0; page.on('request', r => { if (/\/api\/gika/u.test(r.url())) modelTraffic++; });
  await enter(page);
  const uid: string = await page.evaluate(async () => { const path = '/src/platform/firebase.ts'; return (await import(/* @vite-ignore */path)).firebaseAuth.currentUser.uid; });
  const today = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().toString();
  const previous = await batchTestDb.collection(`users/${uid}/activities`).where('schedule.dueDate', '==', today).limit(50).get();
  for (const item of previous.docs) if (item.data().title.startsWith('Teste M8') && !item.data().deletedAt) await command(page, { command: 'activity.trash', operationId: crypto.randomUUID(), entityId: item.id, expectedRevision: item.data().revision, payload: {} });
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) { const id = crypto.randomUUID(); ids.push(id); const payload = batchTestPayload(`Teste M8 ${i}`, i === 1 ? null : '10:00'); payload.schedule.dueDate = today; await command(page, { command: 'activity.create', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload }); }
  const original = await Promise.all(ids.sort().map(async id => ({ id, data: (await batchTask(uid, id))! })));
  const card = page.getByRole('region', { name: 'Quer organizar o dia?', exact: true }); await expect(card).toBeVisible(); await expect(card).toContainText('4 tarefas pendentes para hoje');
  expect(modelTraffic).toBe(0); for (const item of original) expect(item.data).toMatchObject({ revision: 1, status: 'pending' });
  return { uid, today, ids, original, card };
}
async function model(page: Page, f: Awaited<ReturnType<typeof prepare>>) {
  let calls = 0; let confirmation: BatchConfirmation | undefined;
  const tomorrow = Temporal.PlainDate.from(f.today).add({ days: 1 }).toString();
  await page.route('**/api/gika/respond', async route => {
    calls++; const request = route.request().postDataJSON(); expect(Object.keys(request).sort()).toEqual(['requestId', 'text']); expect(request.text).toBe('Organiza meu dia');
    const organization = { period: 'day', startDate: f.today, endDate: tomorrow, items: f.original.map((item, index) => ({ id: item.id, title: item.data.title, revision: item.data.revision, timeZone: item.data.schedule.timeZone, before: { dueDate: f.today, dueTime: item.data.schedule.dueTime }, after: { dueDate: index === 3 ? f.today : tomorrow, dueTime: item.data.schedule.dueTime }, action: index === 3 ? 'keep' : 'move', recurring: false })) };
    const items = await Promise.all(organization.items.filter(item => item.action === 'move').map(async (item, index) => ({ operationId: await batchOperationId(f.uid, request.requestId, index), id: item.id, title: item.title, revision: item.revision, timeZone: item.timeZone, before: item.before, patch: { dueDate: tomorrow }, scope: 'none' })));
    confirmation = issueBatchConfirmation(f.uid, request, batchPlanSchema.parse({ action: 'reschedule', sourceDate: f.today, items, organization }));
    await route.fulfill({ json: { text: 'Confira as mudanças antes de confirmar.', simulated: false, reads: [], batchConfirmation: confirmation } });
  });
  return { calls: () => calls, preview: () => confirmation!, tomorrow };
}
const input = (page: Page) => page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });

test('M8 local detection, dismiss and meaningful re-evaluation never call the model', async ({ page }) => {
  const f = await prepare(page); let requests = 0; page.on('request', r => { if (/\/api\/gika/u.test(r.url())) requests++; });
  await f.card.getByRole('button', { name: 'Agora não', exact: true }).click(); await expect(f.card).toHaveCount(0); await expect(page.locator('#page-title')).toBeFocused();
  await command(page, { command: 'activity.update', operationId: crypto.randomUUID(), entityId: f.ids[0], expectedRevision: 1, payload: { ...batchTestPayload('Teste M8 novo título'), schedule: f.original[0]!.data.schedule } });
  await expect(f.card).toHaveCount(0);
  await command(page, { command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: f.ids[1], expectedRevision: 1, payload: { status: 'completed' } });
  await expect(f.card).toHaveCount(0);
  const payload = batchTestPayload('Teste M8 novo'); payload.schedule.dueDate = f.today;
  await command(page, { command: 'activity.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload });
  await expect(f.card).toBeVisible(); expect(requests).toBe(0);
});
test('M8 explicit opt-in prepares editable text; only manual send produces existing preview, cancel never writes', async ({ page }) => {
  const f = await prepare(page), m = await model(page, f); let commands = 0; page.on('request', r => { if (r.url().endsWith('/api/commands')) commands++; });
  expect(m.calls()).toBe(0); await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click();
  await expect(input(page)).toHaveValue('Organiza meu dia'); await expect(input(page)).toBeEditable(); await expect(input(page)).toBeFocused(); expect(m.calls()).toBe(0); expect(commands).toBe(0);
  await input(page).press('Enter'); const preview = page.getByRole('group', { name: 'Prévia do lote', exact: true }); await expect(preview).toBeVisible(); expect(m.calls()).toBe(1); expect(commands).toBe(0);
  await preview.getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(preview).toHaveAttribute('data-batch-state', 'cancelled'); expect(commands).toBe(0);
  for (const item of f.original) expect(await batchTask(f.uid, item.id)).toEqual(item.data);
});
test('M8 proposal uses original confirmation, real commands and receipts; no model on confirm', async ({ page }) => {
  const f = await prepare(page), m = await model(page, f); let commands = 0; page.on('request', r => { if (r.url().endsWith('/api/commands')) commands++; });
  await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click(); await expect(input(page)).toHaveValue('Organiza meu dia'); expect(m.calls()).toBe(0);
  await input(page).press('Enter'); const preview = page.getByRole('group', { name: 'Prévia do lote', exact: true }); await expect(preview).toBeVisible(); expect(commands).toBe(0);
  await preview.getByRole('button', { name: 'Reorganizar 3 tarefas', exact: true }).click(); await expect(page.getByRole('group', { name: 'Lote concluído', exact: true })).toHaveAttribute('data-batch-state', 'confirmed'); expect(commands).toBe(3); expect(m.calls()).toBe(1);
  for (const item of m.preview().plan.items) { expect(await batchTask(f.uid, item.id)).toMatchObject({ revision: 2, schedule: { dueDate: m.tomorrow, dueTime: item.before.dueTime } }); expect((await batchReceipt(f.uid, item.operationId))?.response.entityId).toBe(item.id); }
  expect(await batchTask(f.uid, f.original[3]!.id)).toEqual(f.original[3]!.data);
});
test('M8 offline click is local, no lazy AI panel, queue or reconnect execution', async ({ page, context }) => {
  const f = await prepare(page); let requests = 0; page.on('request', r => { if (/\/api\/(?:gika|commands)/u.test(r.url())) requests++; });
  await context.setOffline(true); await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click(); await expect(f.card).toContainText('precisa de conexão'); await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toHaveCount(0); expect(requests).toBe(0);
  await context.setOffline(false); await expect(f.card).toBeVisible(); await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toHaveCount(0); expect(requests).toBe(0);
});
test('M8 preserves existing draft and rejects foreign UID/logout opener without request', async ({ page }) => {
  const f = await prepare(page); let requests = 0; page.on('request', r => { if (/\/api\/gika/u.test(r.url())) requests++; });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('leve:prepare-gika-day', { detail: 'other-test-uid' }))); await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click(); await input(page).fill('Meu rascunho'); await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click(); await expect(input(page)).toHaveValue('Meu rascunho'); await expect(page.locator('#gika-demo-notice')).toContainText('rascunho foi mantido'); expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page.getByLabel('E-mail')).toBeVisible();
  await page.evaluate(uid => window.dispatchEvent(new CustomEvent('leve:prepare-gika-day', { detail: uid })), f.uid); await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toHaveCount(0); expect(requests).toBe(0);
});
test('M8 current Leve surface: desktop/mobile, light/dark, keyboard, zoom and Axe', async ({ page }) => {
  const f = await prepare(page);
  for (const [appearance, width, height] of [['light', 1366, 768], ['dark', 390, 844]] as const) {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
    await page.evaluate(async appearance => { const path = '/src/platform/theme.ts'; (await import(/* @vite-ignore */path)).applyAppearance(appearance); }, appearance);
    await f.card.scrollIntoViewIfNeeded(); expect((await new AxeBuilder({ page }).include('[aria-labelledby="gika-day-suggestion-title"]').analyze()).violations).toEqual([]);
    await page.screenshot({ path: `/tmp/leve-m8-${appearance}-${width}.png` }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await f.card.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); await expect(f.card.getByRole('button', { name: 'Pedir sugestão', exact: true })).toBeInViewport(); expect((await new AxeBuilder({ page }).include('[aria-labelledby="gika-day-suggestion-title"]').analyze()).violations).toEqual([]);
  await f.card.getByRole('button', { name: 'Agora não', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(f.card).toHaveCount(0); await expect(page.locator('#page-title')).toBeFocused();
});

test('M8 cancellation during lazy loading invalidates the pending draft and later intentions stay distinct', async ({ page }) => {
  const f = await prepare(page); let calls = 0;
  page.on('request', r => { if (/\/api\/gika/u.test(r.url())) calls++; });
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/features/gika/GikaPanel.tsx*', async route => { await held; await route.continue(); });
  await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click();
  const loading = page.locator('.gika-load-error'); await expect(loading).toContainText('Abrindo a conversa');
  await loading.getByRole('button', { name: 'Cancelar', exact: true }).click(); release();
  await expect(page.locator('#gika-dialog')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  await expect(input(page)).toHaveValue('');
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  for (const [revision, dueTime] of [[1, '19:00'], [2, '18:00']] as const) {
    const original = f.original[0]!;
    await command(page, { command: 'activity.update', operationId: crypto.randomUUID(), entityId: original.id, expectedRevision: revision, payload: { ...batchTestPayload(original.data.title), schedule: { ...original.data.schedule, dueTime } } });
    await expect(f.card).toBeVisible(); await f.card.getByRole('button', { name: 'Pedir sugestão', exact: true }).click();
    await expect(input(page)).toHaveValue('Organiza meu dia'); await input(page).fill('');
    await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  }
  expect(calls).toBe(0);
});
