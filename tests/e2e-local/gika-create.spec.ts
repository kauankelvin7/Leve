import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';

async function enter(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) {
    const completed = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'profile.completeTutorial');
    await skip.click(); await completed;
  }
}
const dueDate = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().add({ days: 1 }).toString();
const descriptor = (title: string) => ({ text: 'Preparando a tarefa…', simulated: false, reads: [], createTask: { title, dueDate, dueTime: null, timeZone: 'America/Sao_Paulo' } });
async function ask(page: Page, text: string) {
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill(text); await question.press('Enter'); return question;
}
for (const mobile of [false, true]) test(`E10 ${mobile ? 'mobile dark' : 'desktop light'}: structured success after actual command, task survives reload`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  await enter(page);
  if (mobile) await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  const title = `Academia M3 ${mobile ? 'mobile' : 'desktop'}`;
  // Only model interpretation is a fixture. Auth, sendCommand, API transaction and Firestore are real emulators.
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().method() === 'POST' && response.request().postDataJSON()?.command === 'activity.create');
  await ask(page, `${title} amanhã`);
  const response = await ack; expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ result: 'applied', revision: 1 });
  expect(response.request().postDataJSON()).toMatchObject({ command: 'activity.create', expectedRevision: 0, payload: { title, schedule: { type: 'task', dueDate } } });
  const result = page.getByRole('region', { name: 'Tarefa adicionada', exact: true });
  await expect(result).toContainText(title); await expect(result).toContainText(dueDate.split('-').reverse().join('/'));
  await expect(page.locator('.gika-message.is-assistant')).toContainText('Tarefa adicionada.');
  await expect(page.locator('.gika-confirmation, .gika-undo')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: `/tmp/leve-m3-create-${mobile ? 'mobile-dark' : 'desktop-light'}.png` });
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
  await page.reload(); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
});

test('command failure preserves draft, never claims success, conventional agenda remains usable', async ({ page }) => {
  await enter(page);
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor('Falha de comando M3') }));
  await page.route('**/api/commands', route => route.fulfill({ status: 503, json: { code: 'SERVICE_RESTRICTED', message: 'Serviço temporariamente restrito.' } }));
  const question = await ask(page, 'Falha de comando M3 amanhã');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(question).toHaveValue('Falha de comando M3 amanhã');
  await expect(page.getByRole('region', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.unroute('**/api/commands');
  await page.getByRole('link', { name: 'Calendário', exact: true }).click(); await expect(page.locator('#page-title')).toHaveText('Calendário');
});

test('unknown descriptor fields fail before any commands; generated text cannot forge creation', async ({ page }) => {
  await enter(page); let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { ...descriptor('Payload inválido'), createTask: { ...descriptor('Payload inválido').createTask, uid: 'arbitrary' } } }));
  await ask(page, 'Payload inválido amanhã');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); expect(writes).toBe(0);
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
});

test('logout during upstream wait aborts creation before command dispatch', async ({ page }) => {
  await enter(page); let writes = 0; let finish: (() => Promise<void>) | undefined;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => { finish = () => route.fulfill({ json: descriptor('Tarefa tardia') }).catch(() => undefined); });
  await ask(page, 'Tarefa tardia amanhã'); await expect.poll(() => Boolean(finish)).toBe(true);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await finish!();
  await enter(page); await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(page.locator('.gika-message')).toHaveCount(0); expect(writes).toBe(0);
});

test('M3-T2 double submit is one intent; identical content after success is a new intent', async ({ page }) => {
  await enter(page); const title = 'Academia dupla M3-T2'; const interpretations: string[] = []; const commands: string[] = [];
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/gika/respond', async route => {
    interpretations.push(route.request().postDataJSON().requestId);
    if (interpretations.length === 1) await gate;
    await route.fulfill({ json: descriptor(title) });
  });
  page.on('request', request => { if (request.url().endsWith('/api/commands') && request.postDataJSON()?.command === 'activity.create') commands.push(request.postDataJSON().operationId); });
  const question = await ask(page, `${title} amanhã`);
  await expect.poll(() => interpretations.length).toBe(1);
  await question.press('Enter');
  await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).dispatchEvent('click');
  release();
  await expect(page.getByRole('region', { name: 'Tarefa adicionada', exact: true })).toHaveCount(1);
  expect(interpretations).toHaveLength(1); expect(commands).toEqual(interpretations);
  await question.fill(`${title} amanhã`); await question.press('Enter');
  await expect(page.getByRole('region', { name: 'Tarefa adicionada', exact: true })).toHaveCount(2);
  expect(commands).toHaveLength(2); expect(commands[0]).not.toBe(commands[1]); expect(commands).toEqual(interpretations);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(2);
});

test('M3-T2 acknowledgement lost after real commit: retry recovers receipt and creates no duplicate', async ({ page }) => {
  await enter(page); const title = 'Resposta perdida M3-T2'; const requests: string[] = []; const commandIds: string[] = []; const results: string[] = [];
  await page.route('**/api/gika/respond', async route => {
    requests.push(route.request().postDataJSON().requestId);
    // First call mocks only upstream interpretation; the retry reaches the real receipt recovery route.
    if (requests.length === 1) await route.fulfill({ json: descriptor(title) }); else await route.continue();
  });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'activity.create') { await route.continue(); return; }
    commandIds.push(route.request().postDataJSON().operationId);
    const response = await route.fetch(); expect(response.status()).toBe(200);
    results.push((await response.json()).result);
    if (commandIds.length === 1) await route.abort('failed'); else await route.fulfill({ response });
  });
  await ask(page, `${title} amanhã`);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tarefa adicionada', exact: true })).toContainText(title);
  expect(requests).toHaveLength(2); expect(requests[0]).toBe(requests[1]); expect(commandIds).toEqual(requests);
  expect(results).toEqual(['applied', 'alreadyApplied']);
  await page.getByRole('button', { name: 'Fechar Gika' }).click(); await page.goto(`/hoje?dia=${dueDate}`);
  await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
  await page.reload(); await expect(page.locator('.day-activity').filter({ hasText: title })).toHaveCount(1);
});
