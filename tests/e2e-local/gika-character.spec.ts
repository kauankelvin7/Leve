import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Temporal } from '@js-temporal/polyfill';
async function enter(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) { const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'profile.completeTutorial'); await skip.click(); await ack; }
}
const character = (page: Page) => page.locator('.gika-character');
const question = (page: Page) => page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
const open = (page: Page) => page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
const close = (page: Page) => page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();

test('Character development review uses real modes without auth, agenda or provider requests', async ({ page }) => {
  let privateRequests = 0;
  page.on('request', request => { if (/\/api\/|googleapis\.com|:(8080|9099)\//.test(request.url())) privateRequests++; });
  await page.goto('/dev/gika-character');
  await expect(page.getByRole('heading', { name: 'Revisão visual da Gika', exact: true })).toBeVisible();
  await expect(character(page).locator('canvas')).toHaveAttribute('data-rive-ready', 'true');
  for (const state of ['rest', 'idle', 'blink', 'listening', 'thinking', 'clarify', 'success', 'error', 'offline']) {
    await page.getByRole('button', { name: state.charAt(0).toUpperCase() + state.slice(1), exact: true }).click();
    await expect(character(page)).toHaveAttribute('data-character-state', state);
  }
  for (const size of [48, 64, 96, 120]) {
    await page.getByRole('button', { name: `${size} px`, exact: true }).click();
    await expect(character(page)).toHaveCSS('width', `${size}px`);
  }
  await page.getByLabel('Reduzir movimento', { exact: true }).check();
  await expect(character(page)).toHaveAttribute('data-character-state', 'offline');
  await expect(character(page).locator('img')).toHaveAttribute('data-static-state', 'offline');
  await expect(character(page).locator('canvas')).toHaveCount(0);
  await expect(page.locator('dd').last()).toHaveText('fallback');
  await page.getByLabel('Enquadrar como retrato', { exact: true }).uncheck();
  await expect(character(page)).toHaveCSS('overflow', 'visible');
  await page.getByLabel('Escuro', { exact: true }).check();
  await page.getByLabel('Fundo sólido', { exact: true }).check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'MATTE TEST · capturar frame', exact: true }).click();
  const matteImages = page.getByRole('region', { name: 'MATTE TEST', exact: true }).locator('img');
  await expect(matteImages).toHaveCount(5);
  expect(new Set(await matteImages.evaluateAll(images => images.map(image => (image as HTMLImageElement).src))).size).toBe(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(privateRequests).toBe(0);
});

test('Character lazy Rive: real frames, request thinking, narration never success, close cleanup', async ({ page }) => {
  const assets: string[] = []; page.on('request', request => { if (/\.wasm|\.riv(?:\?|$)/.test(request.url())) assets.push(request.url()); });
  await page.addInitScript(() => {
    const browser = window as unknown as Window & { __characterRaf: Set<number> };
    browser.__characterRaf = new Set();
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const visual = /rive\.js|@rive-app_canvas/.test(new Error().stack ?? '');
      const id = request(time => { browser.__characterRaf.delete(id); callback(time); });
      if (visual) browser.__characterRaf.add(id); return id;
    };
    window.cancelAnimationFrame = id => { browser.__characterRaf.delete(id); cancel(id); };
  });
  await enter(page); expect(assets).toEqual([]); await open(page);
  await expect(character(page)).toHaveCount(1); await expect(page.locator('.gika-welcome .gika-character')).toHaveCount(1); await expect(page.locator('.gika-identity .gika-character')).toHaveCount(0);
  await expect(character(page).locator('canvas')).toHaveAttribute('data-rive-ready', 'true');
  await expect.poll(() => page.evaluate(() => (window as unknown as Window & { __characterRaf: Set<number> }).__characterRaf.size)).toBeGreaterThan(0);
  await expect(character(page)).toHaveAttribute('data-character-state', 'idle');
  expect(assets.some(url => url.includes('.wasm'))).toBe(true); expect(assets.some(url => url.includes('.riv'))).toBe(true);
  expect(assets.every(url => new URL(url).origin === 'http://localhost:5174')).toBe(true);
  expect(await character(page).locator('img').evaluate(el => getComputedStyle(el).visibility)).toBe('hidden');
  const idle = await character(page).locator('canvas').evaluate(el => (el as HTMLCanvasElement).toDataURL());
  let finish!: () => Promise<void>; let commands = 0;
  page.on('request', request => { if (request.url().endsWith('/api/commands')) commands++; });
  await page.route('**/api/gika/respond', route => { finish = () => route.fulfill({ json: { text: 'Tarefa criada, segundo o texto do modelo.', simulated: false, reads: [] } }); });
  await question(page).fill('Pergunta sintética'); await expect(character(page)).not.toHaveAttribute('data-character-state', 'listening'); await question(page).press('Enter');
  await expect(character(page)).toHaveAttribute('data-character-state', 'thinking');
  await expect(character(page)).toHaveCount(1); await expect(page.locator('.gika-identity .gika-character')).toHaveCount(1); await expect(page.locator('.gika-welcome .gika-character')).toHaveCount(0);
  await expect(character(page).locator('canvas')).toHaveAttribute('data-rive-ready', 'true');
  await expect.poll(() => character(page).locator('canvas').evaluate(el => (el as HTMLCanvasElement).toDataURL())).not.toBe(idle);
  await finish(); await expect(page.locator('.gika-message.is-assistant')).toBeVisible(); await expect(character(page)).toHaveAttribute('data-character-state', 'idle'); expect(commands).toBe(0);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  for (let i = 0; i < 20; i++) { await close(page); await expect(character(page).locator('canvas')).toHaveCount(0); await open(page); await expect(character(page).locator('canvas')).toHaveAttribute('data-rive-ready', 'true'); }
  await close(page); await expect(character(page).locator('canvas')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as Window & { __characterRaf: Set<number> }).__characterRaf.size)).toBe(0);
});

test('Character success only after real create command ack; failure and logout keep boundaries', async ({ page }) => {
  await enter(page); await open(page); await expect(character(page).locator('canvas')).toHaveAttribute('data-rive-ready', 'true');
  const dueDate = Temporal.Now.instant().toZonedDateTimeISO('America/Sao_Paulo').toPlainDate().add({ days: 1 }).toString();
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Preparando a tarefa…', simulated: false, reads: [], createTask: { title: 'Teste Character Ack', dueDate, dueTime: null, timeZone: 'America/Sao_Paulo' } } }));
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; }); let committed = false;
  await page.route('**/api/commands', async route => { const response = await route.fetch(); committed = response.status() === 200; await held; await route.fulfill({ response }); });
  await question(page).fill('Teste Character Ack amanhã'); await question(page).press('Enter'); await expect.poll(() => committed).toBe(true);
  await expect(character(page)).toHaveAttribute('data-character-state', 'thinking'); await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toHaveCount(0);
  release(); await expect(character(page)).toHaveAttribute('data-character-state', 'success'); await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toBeVisible();
  await page.unroute('**/api/commands'); await page.unroute('**/api/gika/respond');
  await page.route('**/api/gika/respond', route => route.fulfill({ status: 503, json: { code: 'GIKA_UNAVAILABLE', message: 'Indisponível.' } }));
  await question(page).fill('Falha sintética'); await question(page).press('Enter'); await expect(character(page)).toHaveAttribute('data-character-state', 'error');
  await close(page); await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page.locator('.gika-character')).toHaveCount(0);
});

test('Character reduced motion/offline/asset failure preserve faithful static draft and composer', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const assets: string[] = [];
  page.on('request', request => { if (/\.wasm|\.riv(?:\?|$)/.test(request.url())) assets.push(request.url()); });
  await enter(page); await open(page); await expect(character(page)).toHaveAttribute('data-character-state', 'idle'); await expect(character(page).locator('canvas')).toHaveCount(0); expect(assets).toEqual([]);
  await question(page).fill('Rascunho preservado'); await context.setOffline(true); await expect(character(page)).toHaveAttribute('data-character-state', 'offline'); await expect(character(page).locator('img')).toHaveAttribute('data-static-state', 'offline'); await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeDisabled(); await expect(question(page)).toHaveValue('Rascunho preservado');
  await context.setOffline(false); await expect(question(page)).toHaveValue('Rascunho preservado'); await close(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const failedAsset = page.waitForEvent('requestfailed', request => /\.riv(?:\?|$)/.test(request.url()));
  await page.route('**/*.riv*', route => route.abort()); await open(page); await failedAsset;
  await expect(character(page).locator('img')).toBeVisible(); await expect(character(page).locator('canvas[data-rive-ready="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeEnabled(); await expect(question(page)).toHaveValue('Rascunho preservado');
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});

test('Character actual raster/bones and all mode transitions render under deployment CSP', async ({ page }) => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const csp = config.headers.flatMap((row: { headers: { key: string; value: string }[] }) => row.headers).find((header: { key: string }) => header.key === 'Content-Security-Policy').value;
  await page.route('**/gika-rive-csp-test', route => route.fulfill({ headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': csp }, body: '<!doctype html><title>Rive CSP check</title><canvas id="rig" width="135" height="133"></canvas>' }));
  await page.goto('/gika-rive-csp-test');
  const modes = await page.evaluate(async ({ rigUrl, wasmUrl }) => {
    const modulePath = '/node_modules/.vite/deps/@rive-app_canvas.js';
    const module = await import(/* @vite-ignore */ modulePath);
    const { Rive, RuntimeLoader, Layout, Fit, Alignment } = module.default ?? module;
    RuntimeLoader.setWasmUrl(wasmUrl); RuntimeLoader.setWasmFallbackUrl(null);
    const canvas = document.querySelector<HTMLCanvasElement>('#rig')!;
    let rive: import('@rive-app/canvas').Rive | undefined;
    try {
      await new Promise<void>((loaded, failed) => {
        rive = new Rive({ canvas, src: rigUrl, artboard: 'GikaEssential', stateMachine: 'GikaEssential', autoplay: true, autoBind: true, shouldDisableRiveListeners: true, layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), onLoad: loaded, onLoadError: () => failed(new Error('Rive load failed')) });
      });
      const result: { mode: number; painted: number; hash: string }[] = [];
      for (let mode = 0; mode < 9; mode++) {
        rive!.viewModelInstance!.number('mode')!.value = mode;
        for (let frame = 0; frame < 20; frame++) await new Promise<number>(requestAnimationFrame);
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, 135, 133).data;
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels))).map(n => n.toString(16).padStart(2, '0')).join('');
        result.push({ mode: rive!.viewModelInstance!.number('mode')!.value, painted: pixels.filter((_, i) => i % 4 === 3 && pixels[i]! > 0).length, hash });
      }
      return result;
    } finally { rive?.cleanup(); }
  }, { rigUrl: `/@fs/${resolve('assets/gika/rive/essential-bust/gika-essential-bust.riv').replaceAll('\\', '/')}`, wasmUrl: `/@fs/${resolve('node_modules/@rive-app/canvas/rive.wasm').replaceAll('\\', '/')}` });
  expect(modes.map(mode => mode.mode)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  expect(modes.every(mode => mode.painted > 1000)).toBe(true);
  expect(new Set(modes.map(mode => mode.hash)).size).toBeGreaterThanOrEqual(5);
});
