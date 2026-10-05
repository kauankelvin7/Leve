import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
}
const descriptor = (title: string) => ({ text: 'Preparando a lista…', simulated: false, reads: [], createShoppingList: { title } });
async function ask(page: Page, text: string) {
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill(text); await input.press('Enter'); return input;
}
const listAck = (page: Page) => page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'shoppingList.create');

// Only interpretation is synthetic. Auth, command API, receipts and persistence are real emulators.
for (const mobile of [false, true]) test(`shopping ${mobile ? 'mobile dark reflow' : 'desktop light'}: create, checked ACK, open list and reload`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  await open(page);
  if (mobile) await page.evaluate(async () => {
    const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark');
    document.documentElement.style.fontSize = '200%';
  });
  const title = `Jantar ${mobile ? 'mobile' : 'desktop'}`;
  await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  const ack = listAck(page);
  await ask(page, `Crie uma lista de compras com o nome ${title}`);
  const response = await ack; expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ revision: 1, result: 'applied' });
  const command = response.request().postDataJSON();
  expect(command).toMatchObject({ command: 'shoppingList.create', expectedRevision: 0, payload: { title, listKind: 'regular', cycleKey: null } });
  expect(command.entityId).toBe(command.operationId);
  const card = page.getByRole('group', { name: 'Lista de compras criada', exact: true });
  await expect(card).toContainText(title);
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  expect(await page.locator('#gika-dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: `.cache/gika-assistant/shopping/${mobile ? 'mobile-dark-reflow' : 'desktop-light'}.png` });
  await card.getByRole('link', { name: `Abrir lista ${title}`, exact: true }).click();
  await expect(page.locator('#gika-dialog')).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText(title);
  await expect(page.getByLabel('Adicionar item', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator('#page-title')).toHaveText(title);
  await page.goto('/compras'); await expect(page.locator('.shopping-list-cards').getByRole('link').filter({ hasText: title })).toHaveCount(1);
});

test('shopping lost acknowledgement: no false success; retry uses original receipt with one list', async ({ page }) => {
  await open(page); const title = 'Jantar resposta perdida'; const requestIds: string[] = []; const commandIds: string[] = []; const results: string[] = [];
  await page.route('**/api/gika/respond', async route => {
    requestIds.push(route.request().postDataJSON().requestId);
    if (requestIds.length === 1) await route.fulfill({ json: descriptor(title) }); else await route.continue();
  });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'shoppingList.create') { await route.continue(); return; }
    commandIds.push(route.request().postDataJSON().operationId);
    const response = await route.fetch(); expect(response.status()).toBe(200); results.push((await response.json()).result);
    if (commandIds.length === 1) await route.abort('failed'); else await route.fulfill({ response });
  });
  const input = await ask(page, `Crie uma lista de compras chamada ${title}`);
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(input).toHaveValue(`Crie uma lista de compras chamada ${title}`);
  await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toContainText(title);
  expect(requestIds).toHaveLength(2); expect(requestIds[0]).toBe(requestIds[1]); expect(commandIds).toEqual(requestIds);
  expect(results).toEqual(['applied', 'alreadyApplied']);
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click(); await page.goto('/compras');
  await expect(page.locator('.shopping-list-cards').getByRole('link').filter({ hasText: title })).toHaveCount(1);
});

test('shopping duplicate submit waits for real ACK and preserves list context without command IDs', async ({ page }) => {
  await open(page); const title = 'Jantar aguardando'; let requests = 0; let writes = 0; let requestId: string | undefined;
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/gika/respond', async route => {
    requests++; const body = route.request().postDataJSON(); requestId = body.requestId;
    if (requests === 1) { await route.fulfill({ json: descriptor(title) }); return; }
    expect(JSON.stringify(body.conversation)).toContain('shopping_list_created');
    expect(JSON.stringify(body.conversation)).toContain(title);
    expect(JSON.stringify(body.conversation)).not.toMatch(/requestTextHash|revision|operationId/);
    await route.fulfill({ json: { text: 'Para adicionar itens, abra sua lista em Compras.', intent: 'agenda_action', simulated: false, reads: [] } });
  });
  await page.route('**/api/commands', async route => {
    if (route.request().postDataJSON()?.command !== 'shoppingList.create') { await route.continue(); return; }
    writes++; const response = await route.fetch(); expect(response.status()).toBe(200); await gate; await route.fulfill({ response });
  });
  const input = await ask(page, `Crie uma lista de compras chamada ${title}`);
  await expect.poll(() => writes).toBe(1);
  await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toHaveCount(0);
  await input.press('Enter'); await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).dispatchEvent('click');
  expect(requests).toBe(1); const originalId = requestId;
  release(); await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toContainText(title);
  await ask(page, 'Põe arroz nessa lista'); await expect(page.locator('.gika-message.is-assistant').last()).toContainText('abra sua lista');
  expect(writes).toBe(1); expect(requestId).not.toBe(originalId);
});

test('shopping read cards have literal names, a partial warning, no writes and usable list navigation', async ({ page }) => {
  await open(page); const title = 'Jantar <b>12</b>'; await page.route('**/api/gika/respond', route => route.fulfill({ json: descriptor(title) }));
  const ack = listAck(page); await ask(page, `Crie uma lista de compras chamada "${title}"`); const response = await ack;
  const id = response.request().postDataJSON().entityId; await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toBeVisible();
  await page.unroute('**/api/gika/respond'); let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Aqui estão as listas disponíveis nesta consulta.', simulated: false, reads: [], shoppingLists: { cached: false, partial: true, items: [{ id, title, listKind: 'regular', revision: 1, itemCount: 0, pendingItemCount: 0 }] } } }));
  await ask(page, 'Quais listas eu tenho?'); const read = page.getByRole('region', { name: 'Suas listas de compras', exact: true });
  await expect(read).toContainText('Consulta parcial'); await expect(read.getByRole('link', { name: title, exact: true })).toBeVisible();
  await expect(read.locator('b')).toHaveCount(0); expect(writes).toBe(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await read.getByRole('link', { name: title, exact: true }).click(); await expect(page.locator('#gika-dialog')).toBeHidden();
  await expect(page.locator('#page-title')).toHaveText(title);
});

test('shopping malformed output never writes; focused missing-name clarification keeps only the missing field', async ({ page }) => {
  await open(page); let writes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { ...descriptor('Jantar'), createShoppingList: { title: 'Jantar', uid: 'other', items: ['arroz'] } } }));
  await ask(page, 'Crie uma lista de compras chamada Jantar');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible(); expect(writes).toBe(0);
  await page.unroute('**/api/gika/respond');
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Qual nome você quer dar à lista?', intent: 'agenda_action', simulated: false, reads: [] } }));
  await ask(page, 'Cria uma lista de compras'); await expect(page.locator('.gika-message.is-assistant').last()).toHaveText(/Qual nome você quer dar à lista\?/);
  expect(writes).toBe(0); await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toHaveCount(0);
});

test('opening a confirmed list cancels a pending response before any late command can dispatch', async ({ page }) => {
  await open(page); const title = 'Jantar navegação segura'; let calls = 0; let writes = 0;
  let finish: (() => Promise<void>) | undefined;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/commands')) writes++; });
  await page.route('**/api/gika/respond', route => {
    calls++;
    if (calls === 1) return route.fulfill({ json: descriptor(title) });
    finish = () => route.fulfill({ json: descriptor('Resposta depois de sair') }).catch(() => undefined);
  });
  const ack = listAck(page); await ask(page, `Crie uma lista de compras chamada ${title}`); await ack;
  const card = page.getByRole('group', { name: 'Lista de compras criada', exact: true }); await expect(card).toContainText(title);
  await ask(page, 'Cria outra lista chamada Resposta depois de sair'); await expect.poll(() => Boolean(finish)).toBe(true);
  await card.getByRole('link', { name: `Abrir lista ${title}`, exact: true }).click(); await finish!();
  await expect(page.locator('#gika-dialog')).toBeHidden(); await expect(page.locator('#page-title')).toHaveText(title);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Lista de compras criada', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeEnabled();
  expect(writes).toBe(1);
});
