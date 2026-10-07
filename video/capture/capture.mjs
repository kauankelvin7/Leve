import { chromium, devices } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const value = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const run = value('--run') ?? 'run-1';
const selected = value('--scene');
const date = '2026-10-07';
const baseURL = 'http://localhost:5174';
const output = resolve('video/assets/captures', run);
const phoneOutput = resolve(output, 'mobile');
const manifestOutput = resolve('video/capture/manifests');
await mkdir(output, { recursive: true });
await mkdir(phoneOutput, { recursive: true });
await mkdir(manifestOutput, { recursive: true });
execFileSync('node', ['scripts/seed-local.mjs'], { env: { ...process.env, LEVE_RESET_SEED: 'true' }, stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const desktop = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' };
const titles = {
  activity: 'Organizar semana de estudos',
  note: 'Uma ideia para retomar',
  noteBody: 'Rever as ideias do projeto e escolher o próximo passo.',
  list: 'Mercado da semana',
};
const manifest = { run, app: baseURL, branch: 'video/product-film', repoCommit: '33707a4e72b863f1689113f51e95118a5568bebe', capturedAt: new Date().toISOString(), viewport: '1600x900', deviceScaleFactor: 2, locale: 'pt-BR', timezone: 'America/Sao_Paulo', civilDate: date, data: 'Emulator / leve.local@example.test; fictional', scenes: {}, browserErrors: [] };

async function login(page) {
  await page.goto(`${baseURL}/entrar`);
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ }).waitFor();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta fictícia');
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  const guide = page.getByRole('button', { name: 'Pular guia', exact: true });
  await guide.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await guide.isVisible()) {
    await guide.click();
    await page.getByRole('dialog', { name: /Guia do Leve/ }).waitFor({ state: 'detached', timeout: 5000 }).catch(() => undefined);
  }
  await page.getByRole('heading', { name: 'Meu dia' }).waitFor();
  await page.getByText('Carregando seu dia...', { exact: true }).waitFor({ state: 'hidden' });
}

async function bootstrap() {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await login(page);
  if (!await page.getByText(titles.activity, { exact: true }).count()) {
    await page.getByRole('button', { name: 'Nova atividade' }).click();
    await page.getByLabel('Título').fill(titles.activity);
    await page.getByLabel('Data').fill(date);
    const activityWrite = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'activity.create');
    await page.getByRole('button', { name: 'Adicionar atividade' }).click();
    const activityAck = await activityWrite;
    if (activityAck.status() !== 200) throw new Error(`Seed activity command returned ${activityAck.status()}`);
    await page.getByText(titles.activity, { exact: true }).first().waitFor();
    await page.goto(`${baseURL}/hoje`);
    await page.getByText(titles.activity, { exact: true }).first().waitFor();
  }
  await page.goto(`${baseURL}/notas`);
  await page.getByRole('heading', { name: 'Notas' }).waitFor();
  if (!await page.getByRole('heading', { name: titles.note, exact: true }).count()) {
    await page.getByLabel('Título').fill(titles.note);
    await page.getByLabel('Texto', { exact: true }).fill(titles.noteBody);
    const noteWrite = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'note.save');
    await page.getByRole('button', { name: 'Salvar nota', exact: true }).click();
    const ack = await noteWrite;
    if (ack.status() !== 200) throw new Error(`Seed note command returned ${ack.status()}`);
    await page.getByRole('heading', { name: titles.note, exact: true }).waitFor();
  }
  await page.goto(`${baseURL}/compras`);
  await page.getByRole('heading', { name: 'Compras' }).waitFor();
  if (!await page.getByText(titles.list, { exact: true }).count()) {
    await page.getByLabel('Nome da lista', { exact: true }).fill(titles.list);
    const listWrite = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'shoppingList.create');
    await page.getByRole('button', { name: 'Criar lista', exact: true }).click();
    const listAck = await listWrite;
    if (listAck.status() !== 200) throw new Error(`Seed shopping list command returned ${listAck.status()}`);
    await page.waitForURL(/\/compras\//);
    await page.getByLabel('Adicionar item', { exact: true }).fill('Café');
    const coffeeWrite = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'shoppingItem.create');
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
    const coffeeAck = await coffeeWrite;
    if (coffeeAck.status() !== 200) throw new Error(`Seed coffee command returned ${coffeeAck.status()}`);
    await page.getByText('Café', { exact: true }).waitFor();
    await page.getByLabel('Adicionar item', { exact: true }).fill('Bananas');
    const bananaWrite = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'shoppingItem.create');
    await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
    const bananaAck = await bananaWrite;
    if (bananaAck.status() !== 200) throw new Error(`Seed banana command returned ${bananaAck.status()}`);
    await page.getByText('Bananas', { exact: true }).waitFor();
    await page.goto(`${baseURL}/compras`);
    await page.getByText(titles.list, { exact: true }).first().waitFor();
  }
  const onlineState = await context.storageState();
  const offlineState = await context.storageState({ indexedDB: true });
  await context.close();
  return { onlineState, offlineState };
}

const storageStates = await bootstrap();
const allScenes = ['cold-open', 'brand', 'today', 'calendar', 'notes', 'shopping', 'gika', 'offline', 'closing'];
const scenes = selected ? [selected] : allScenes;

function record(page, scene) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const actions = [];
  async function action(kind, locator, invoke) {
    const isLocator = typeof locator !== 'string';
    const boundingBox = isLocator ? await locator.boundingBox() : null;
    const target = isLocator ? await locator.getAttribute('aria-label') ?? await locator.getAttribute('placeholder') ?? await locator.innerText().catch(() => '') : locator;
    actions.push({ timestamp: new Date().toISOString(), type: kind, target, boundingBox });
    await invoke();
  }
  async function shot(name, { locator, fullPage = false } = {}) {
    if (scene !== 'offline') {
      await page.waitForFunction(() => navigator.onLine === true);
      await page.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden' });
      await page.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden' });
      await page.getByText('Conexão restaurada', { exact: true }).waitFor({ state: 'hidden' });
    }
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const path = resolve(output, name);
    if (locator) await locator.screenshot({ path });
    else await page.screenshot({ path, fullPage });
    const bytes = await readFile(path);
    const info = await stat(path);
    const bodyText = await page.locator('body').innerText();
    const expectedOfflineFrame = scene === 'offline' && ['offline-banner.png', 'offline-pending.png'].includes(name);
    if (!expectedOfflineFrame && /Sem conexão\. Mostrando dados salvos\.|Modo offline|Conexão restaurada/.test(bodyText)) throw new Error(`Unexpected offline state in ${scene}/${name}`);
    if (/Carregando seu dia\.\.\.|Carregando suas notas|Carregando atividades|Carregando o mês|Carregando os itens/.test(bodyText)) throw new Error(`Loading state in ${scene}/${name}`);
    await writeFile(path.replace(/\.png$/, '.text.txt'), bodyText);
    return { path: path.replace(`${process.cwd()}/`, ''), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: info.size, dimensions: await page.evaluate(() => `${innerWidth * devicePixelRatio}x${innerHeight * devicePixelRatio}`) };
  }
  async function finish(files) {
    manifest.scenes[scene] = { actions, captures: files };
    manifest.browserErrors.push(...errors.map(error => ({ scene, error })));
  }
  return { page, action, shot, finish, errors };
}

async function newPage({ offlineCache = false } = {}) {
  const context = await browser.newContext({ ...desktop, storageState: offlineCache ? storageStates.offlineState : storageStates.onlineState });
  const page = await context.newPage();
  await page.goto(`${baseURL}/hoje`);
  await page.getByRole('heading', { name: 'Meu dia' }).waitFor();
  await page.getByText(titles.activity, { exact: true }).first().waitFor();
  await page.waitForFunction(() => navigator.onLine === true);
  await page.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.scrollY === 0);
  return { context, page };
}

for (const scene of scenes) {
  if (scene === 'cold-open') {
    const { context, page } = await newPage(); const c = record(page, scene);
    await page.getByText(titles.activity, { exact: true }).first().waitFor();
    const opening = await c.shot('opening-today.png');
    const logo = await c.shot('opening-brand.png', { locator: page.locator('.brand').first() });
    await c.finish([opening, logo]); await context.close();
  } else if (scene === 'brand') {
    const { context, page } = await newPage(); const c = record(page, scene);
    await page.getByRole('heading', { name: 'Meu dia' }).waitFor();
    const file = await c.shot('brand-reference.png', { locator: page.locator('.brand').first() });
    await c.finish([file]); await context.close();
  } else if (scene === 'today') {
    const { context, page } = await newPage(); const c = record(page, scene);
    await page.getByText(titles.activity, { exact: true }).first().waitFor();
    const file = await c.shot('today.png');
    await c.finish([file]); await context.close();
  } else if (scene === 'calendar') {
    const { context, page } = await newPage(); const c = record(page, scene);
    const nav = page.getByRole('link', { name: 'Calendário', exact: true });
    await c.action('click', nav, () => nav.click());
    await page.getByRole('heading', { name: 'Calendário' }).waitFor();
    await page.getByText(titles.activity, { exact: true }).first().waitFor();
    await page.getByText('Carregando atividades…', { exact: true }).waitFor({ state: 'hidden' });
    const week = page.getByRole('button', { name: 'Semana', exact: true });
    if (await week.isVisible()) { await c.action('click', week, () => week.click()); await page.getByRole('button', { name: 'Semana', exact: true }).waitFor(); }
    const file = await c.shot('calendar.png');
    await c.finish([file]); await context.close();
    const phoneContext = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', storageState: storageStates.onlineState });
    const phone = await phoneContext.newPage(); await phone.goto(`${baseURL}/calendario`); await phone.getByRole('heading', { name: 'Calendário' }).waitFor(); await phone.getByRole('button', { name: 'Semana', exact: true }).waitFor(); await phone.getByText(titles.activity, { exact: true }).first().waitFor(); await phone.getByText('Carregando atividades…', { exact: true }).waitFor({ state: 'hidden' }); await phone.waitForFunction(() => navigator.onLine === true); await phone.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden' }); await phone.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden' }); await phone.getByText('Conexão restaurada', { exact: true }).waitFor({ state: 'hidden' }); await phone.evaluate(() => document.fonts.ready); await phone.mouse.move(0, 0); await phone.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await phone.screenshot({ path: resolve(phoneOutput, 'calendar-mobile.png') });
    const png = await readFile(resolve(phoneOutput, 'calendar-mobile.png'));
    const mobileText = await phone.locator('body').innerText();
    if (/Sem conexão\. Mostrando dados salvos\.|Modo offline|Conexão restaurada|Carregando atividades/.test(mobileText)) throw new Error('Offline/loading state in mobile calendar capture');
    const mobileSensitive = mobileText.match(/AIza[0-9A-Za-z_-]{35}|Bearer\s+[A-Za-z0-9._-]{16,}/) || [...mobileText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].some(match => !match[0].endsWith('@example.test'));
    if (mobileSensitive) throw new Error('Sensitive text detected in mobile capture');
    manifest.mobile = { capture: `video/assets/captures/${run}/mobile/calendar-mobile.png`, device: 'Playwright Pixel 7 descriptor; 390x844; touch', sha256: createHash('sha256').update(png).digest('hex'), bytes: png.length };
    await phoneContext.close();
  } else if (scene === 'notes') {
    const { context, page } = await newPage(); const c = record(page, scene);
    const nav = page.getByRole('link', { name: 'Notas', exact: true });
    await c.action('click', nav, () => nav.click());
    await page.getByRole('heading', { name: titles.note, exact: true }).waitFor();
    const file = await c.shot('notes.png');
    await c.finish([file]); await context.close();
  } else if (scene === 'shopping') {
    const { context, page } = await newPage(); const c = record(page, scene);
    const nav = page.getByRole('link', { name: 'Compras', exact: true });
    await c.action('click', nav, () => nav.click());
    await page.getByText(titles.list, { exact: true }).first().waitFor();
    const file = await c.shot('shopping.png');
    await c.finish([file]); await context.close();
  } else if (scene === 'gika') {
    const { context, page } = await newPage(); const c = record(page, scene);
    await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
    await input.waitFor();
    await c.action('digitação', input, () => input.fill('Agende ir à feira amanhã às 19:00 e me avise'));
    const command = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'activity.create');
    await c.action('envio', input, () => input.press('Enter'));
    const ack = await command;
    if (ack.status() !== 200) throw new Error(`Gika real command returned ${ack.status()}`);
    await page.getByRole('group', { name: 'Tarefa adicionada', exact: true }).waitFor();
    const file = await c.shot('gika.png');
    await c.finish([file]); await context.close();
  } else if (scene === 'offline') {
    const { context, page } = await newPage({ offlineCache: true }); const c = record(page, scene);
    const notesNav = page.getByRole('link', { name: 'Notas', exact: true });
    await c.action('click', notesNav, () => notesNav.click()); await page.getByRole('heading', { name: titles.note, exact: true }).waitFor();
    const shoppingNav = page.getByRole('link', { name: 'Compras', exact: true });
    await c.action('click', shoppingNav, () => shoppingNav.click()); await page.getByText(titles.list, { exact: true }).first().waitFor();
    const todayNav = page.getByRole('link', { name: 'Meu dia', exact: true });
    await c.action('click', todayNav, () => todayNav.click()); await page.getByText(titles.activity, { exact: true }).first().waitFor();
    await page.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden' });
    const secondPage = await context.newPage();
    await secondPage.goto(`${baseURL}/hoje`);
    await secondPage.getByRole('heading', { name: 'Meu dia' }).waitFor();
    await secondPage.getByText(titles.activity, { exact: true }).first().waitFor();
    await secondPage.waitForFunction(() => navigator.onLine === true);
    await secondPage.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden' });
    await secondPage.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden' });
    await c.action('network-offline', 'BrowserContext.setOffline(true)', () => context.setOffline(true));
    await page.getByText('Modo offline', { exact: true }).waitFor();
    const offline = await c.shot('offline-banner.png');
    const newActivity = page.getByRole('button', { name: 'Nova atividade' });
    await c.action('click', newActivity, () => newActivity.click());
    const title = page.getByLabel('Título');
    await c.action('fill', title, () => title.fill('Regar as plantas'));
    const dueDate = page.getByLabel('Data');
    await c.action('fill', dueDate, () => dueDate.fill(date));
    const addActivity = page.getByRole('button', { name: 'Adicionar atividade' });
    await c.action('click', addActivity, () => addActivity.click());
    await page.getByText(/Salvo neste aparelho e aguardando conexão/).waitFor();
    await page.locator('.activity-composer').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const pending = await c.shot('offline-pending.png');
    const replay = page.waitForResponse(r => r.url().endsWith('/api/commands') && r.request().postDataJSON()?.command === 'activity.create', { timeout: 20_000 });
    await c.action('network-online', 'BrowserContext.setOffline(false)', () => context.setOffline(false));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await secondPage.evaluate(() => window.dispatchEvent(new Event('online')));
    const replayAck = await replay;
    if (replayAck.status() !== 200) throw new Error(`Offline outbox replay returned ${replayAck.status()}`);
    // Requery after the real outbox ACK so this still shows server-backed state,
    // not the transient cached/offline label that can outlive the reconnect toast.
    await secondPage.reload();
    await secondPage.getByRole('heading', { name: 'Meu dia' }).waitFor();
    await secondPage.getByText('Regar as plantas', { exact: true }).waitFor({ timeout: 20_000 });
    await secondPage.getByText('Sem conexão. Mostrando dados salvos.', { exact: true }).waitFor({ state: 'hidden', timeout: 10_000 });
    await secondPage.getByText('Modo offline', { exact: true }).waitFor({ state: 'hidden', timeout: 10_000 });
    await secondPage.getByText('Conexão restaurada', { exact: true }).waitFor({ state: 'hidden', timeout: 10_000 });
    await secondPage.evaluate(() => document.fonts.ready);
    await secondPage.screenshot({ path: resolve(output, 'offline-synced.png') });
    const syncedBytes = await readFile(resolve(output, 'offline-synced.png'));
    const syncedInfo = await stat(resolve(output, 'offline-synced.png'));
    const syncedCapture = { path: `video/assets/captures/${run}/offline-synced.png`, sha256: createHash('sha256').update(syncedBytes).digest('hex'), bytes: syncedInfo.size, dimensions: await secondPage.evaluate(() => `${innerWidth * devicePixelRatio}x${innerHeight * devicePixelRatio}`) };
    await writeFile(resolve(output, 'offline-synced.text.txt'), await secondPage.locator('body').innerText());
    await c.finish([offline, pending, syncedCapture]); await context.close();
  } else if (scene === 'closing') {
    const { context, page } = await newPage(); const c = record(page, scene);
    const nav = page.getByRole('link', { name: 'Notas', exact: true });
    await c.action('click', nav, () => nav.click()); await page.getByRole('heading', { name: titles.note, exact: true }).waitFor();
    const file = await c.shot('closing-same-note.png');
    await c.finish([file]); await context.close();
  } else throw new Error(`Unknown scene: ${scene}`);
  const sceneRecord = manifest.scenes[scene];
  const paths = sceneRecord.captures.map(item => resolve(item.path));
  for (const path of paths) {
    const scanText = await readFile(path.replace(/\.png$/, '.text.txt'), 'utf8').catch(() => '');
    const forbidden = scanText.match(/AIza[0-9A-Za-z_-]{35}|Bearer\s+[A-Za-z0-9._-]{16,}/);
    const emails = [...scanText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(match => match[0]);
    if (forbidden || emails.some(email => !email.endsWith('@example.test'))) throw new Error(`Sensitive text detected in capture ${path}`);
  }
  console.log(`Captured ${scene}: ${sceneRecord.captures.length} still(s)`);
}

const manifestJson = JSON.stringify(manifest, null, 2);
await writeFile(resolve(output, 'manifest.json'), manifestJson);
await writeFile(resolve(manifestOutput, `${run}.json`), manifestJson);
await browser.close();
