import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';
const dueDate = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().toString();
async function enter(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia'); const skip = page.getByRole('button', { name: 'Pular guia', exact: true }); await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) { const ack = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'profile.completeTutorial'); await skip.click(); await ack; }
}
const payload = (title: string) => ({ title, descriptionPlain: 'Nota sintética preservada', categoryId: null, colorHex: '#65A885', estimatedMinutes: 35, reminderSpecs: [], schedule: { type: 'task', dueDate, dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' } });
async function create(page: Page, title: string) { return page.evaluate(async value => {
  const path = '/src/platform/api.ts'; const { sendCommand } = await import(/* @vite-ignore */ path); const id = crypto.randomUUID();
  await sendCommand({ command: 'activity.create', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 0, payload: value }); return id;
}, payload(title)); }
const descriptor = (id: string, title: string, next: string) => ({ text: 'Preparando a alteração…', simulated: false, reads: [], updateTask: { id, title, dueDate, timeZone: 'America/Sao_Paulo', revision: 1, patch: { title: next } } });
async function ask(page: Page, title: string, next: string) { await page.getByRole('button', { name: 'Pergunte à Gika' }).click(); const q = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await q.fill(`Renomeia "${title}" para "${next}"`); await q.press('Enter'); return q; }
for (const mobile of [false, true]) test(`M4-T2 ${mobile ? 'mobile dark' : 'desktop light'} title patch, exact entity, double submit and real ack`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); } await enter(page);
  if (mobile) await page.evaluate(async () => { const path = '/src/platform/theme.ts'; (await import(/* @vite-ignore */ path)).applyAppearance('dark'); });
  const title = `Estudar Java M4T2 ${mobile ? 'mobile' : 'desktop'}`, next = `Revisar Java M4T2 ${mobile ? 'mobile' : 'desktop'}`, id = await create(page, title);
  await create(page, `${title} outro`); let model = 0, committed = false; const ops: string[] = [];
  await page.route('**/api/gika/respond', route => { model++; return route.fulfill({ json: descriptor(id, title, next) }); });
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/commands', async route => {
    const c = route.request().postDataJSON(); expect(c.command).toBe('activity.update'); expect(c.entityId).toBe(id); expect(c.expectedRevision).toBe(1); expect(c.payload).toEqual({ title: next }); ops.push(c.operationId);
    const response = await route.fetch(); expect(response.status()).toBe(200); expect((await response.json()).revision).toBe(2); committed = true; await gate; await route.fulfill({ response });
  });
  const q = await ask(page, title, next); await expect.poll(() => committed).toBe(true);
  const card = page.getByRole('group', { name: 'Tarefa atualizada', exact: true }); await expect(card).toHaveCount(0); await q.press('Enter'); await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).dispatchEvent('click');
  release(); await expect(card).toContainText(next); await expect(page.locator('.gika-message.is-assistant')).toContainText('Tarefa atualizada.'); expect(model).toBe(1); expect(ops).toHaveLength(1); await expect(card.getByRole('button')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]); await page.screenshot({ path: `/tmp/leve-m4t2-update-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`); await page.reload();
  await expect(page.locator('.day-activity').filter({ hasText: next })).toHaveCount(1); await expect(page.locator('.day-activity').filter({ hasText: `${title} outro` })).toHaveCount(1);
});
test('M4-T2 lost real acknowledgement retries original operation without another revision', async ({ page }) => {
  await enter(page); const title = 'Academia M4T2 retry', next = 'Treino M4T2 retry', id = await create(page, title), ops: string[] = [], results: string[] = []; let model = 0;
  await page.route('**/api/gika/respond', route => { model++; return route.fulfill({ json: descriptor(id, title, next) }); });
  await page.route('**/api/commands', async route => {
    const c = route.request().postDataJSON(); ops.push(c.operationId); expect(c.payload).toEqual({ title: next }); const response = await route.fetch(); expect(response.status()).toBe(200); const ack = await response.json(); results.push(ack.result); expect(ack.revision).toBe(2);
    if (ops.length === 1) await route.abort('failed'); else await route.fulfill({ response });
  });
  await ask(page, title, next); await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); await expect(page.getByRole('group', { name: 'Tarefa atualizada', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByRole('group', { name: 'Tarefa atualizada', exact: true })).toContainText(next);
  expect(ops).toHaveLength(2); expect(ops[0]).toBe(ops[1]); expect(results).toEqual(['applied', 'alreadyApplied']); expect(model).toBe(1);
});
test('M4-T2 no-op, ambiguous, missing and partial observations perform no command', async ({ page }) => {
  await enter(page); let writes = 0, status = 'ambiguous'; page.on('request', r => { if (r.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: status === 'unchanged' ? 'Essa tarefa já se chama “Treino”.' : 'Confira o título e o dia da tarefa.', simulated: false, reads: [], updateResolution: { status, candidates: status === 'ambiguous' ? [{ id: 'one', title: 'Academia', dueDate, status: 'pending' }, { id: 'two', title: 'Academia', dueDate, status: 'pending' }] : [] } } }));
  const q = await ask(page, 'Academia', 'Treino'); await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  let count = 1; for (status of ['not_found', 'partial', 'unchanged']) { await q.fill('Renomeia Academia para Treino'); await q.press('Enter'); await expect(page.locator('.gika-message.is-assistant')).toHaveCount(++count); }
  expect(writes).toBe(0); await expect(page.getByRole('group', { name: 'Tarefa atualizada', exact: true })).toHaveCount(0);
});
test('M4-T2 later conventional edit conflicts without refresh, forced overwrite or misleading retry', async ({ page }) => {
  await enter(page); const title = 'Academia M4T2 conflito', next = 'Treino M4T2 conflito', id = await create(page, title), edited = payload(`${title} alterada`); let updates = 0;
  await page.route('**/api/gika/respond', async route => {
    await page.evaluate(async ({ id, edited }) => { const path = '/src/platform/api.ts'; const { sendCommand } = await import(/* @vite-ignore */ path); await sendCommand({ command: 'activity.update', operationId: crypto.randomUUID(), entityId: id, expectedRevision: 1, payload: edited }); }, { id, edited });
    await route.fulfill({ json: descriptor(id, title, next) });
  });
  page.on('request', r => { if (r.url().endsWith('/api/commands') && r.postDataJSON()?.gikaUpdate) updates++; });
  await ask(page, title, next); await expect(page.locator('.gika-feedback')).toContainText('Essa tarefa mudou enquanto você estava editando. Faça o pedido novamente.');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveCount(0); await expect(page.getByRole('group', { name: 'Tarefa atualizada', exact: true })).toHaveCount(0); expect(updates).toBe(1);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`); await expect(page.locator('.day-activity').filter({ hasText: edited.title })).toHaveCount(1); await expect(page.locator('.day-activity').filter({ hasText: next })).toHaveCount(0);
});
test('M4-T2 logout during resolution cannot dispatch update or expose stale card', async ({ page }) => {
  await enter(page); const title = 'Academia M4T2 logout', next = 'Treino M4T2 logout', id = await create(page, title); let writes = 0, finish: (() => Promise<void>) | undefined;
  page.on('request', r => { if (r.url().endsWith('/api/commands') && r.postDataJSON()?.gikaUpdate) writes++; });
  await page.route('**/api/gika/respond', route => { finish = () => route.fulfill({ json: descriptor(id, title, next) }).catch(() => undefined); });
  await ask(page, title, next); await expect.poll(() => Boolean(finish)).toBe(true); await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await finish!(); await enter(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click(); await expect(page.locator('.gika-message')).toHaveCount(0); expect(writes).toBe(0);
});
