import { chromium } from '@playwright/test';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('video/assets/captures/spike-final-05');
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
const config = { viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' };
async function ready(page) {
  await page.goto('http://localhost:5174/hoje');
  await page.getByRole('heading', { name: 'Meu dia' }).waitFor();
  await page.getByText('Organizar semana de estudos', { exact: true }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

// One real UI action feeds each method: toggle the real seeded activity.
const seedContext = await browser.newContext(config);
const seedPage = await seedContext.newPage();
await seedPage.clock.install({ time: new Date('2026-10-07T12:00:00-03:00') });
await seedPage.goto('http://localhost:5174/entrar');
await seedPage.getByLabel('E-mail').fill('leve.local@example.test');
await seedPage.getByLabel('Senha', { exact: true }).fill('leve-local-123');
await seedPage.getByRole('button', { name: 'Entrar', exact: true }).click();
await seedPage.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ }).waitFor();
if (await seedPage.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
  await seedPage.getByRole('button', { name: 'Criar minha agenda' }).click();
}
const skip = seedPage.getByRole('button', { name: 'Pular guia', exact: true });
if (await skip.isVisible()) await skip.click();
await seedPage.getByText('Carregando seu dia...', { exact: true }).waitFor({ state: 'hidden' });
if (!await seedPage.getByText('Organizar semana de estudos', { exact: true }).count()) {
  await seedPage.getByRole('button', { name: 'Nova atividade' }).click();
  await seedPage.getByLabel('Título').fill('Organizar semana de estudos');
  await seedPage.getByLabel('Data').fill('2026-10-07');
  await seedPage.getByRole('button', { name: 'Adicionar atividade' }).click();
  await seedPage.getByText('Organizar semana de estudos', { exact: true }).waitFor();
  await seedPage.goto('http://localhost:5174/hoje');
  await seedPage.getByText('Organizar semana de estudos', { exact: true }).first().waitFor();
}
await seedPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await seedPage.waitForFunction(() => window.scrollY === 0);
await seedPage.getByRole('heading', { name: 'Meu dia' }).scrollIntoViewIfNeeded();
await seedPage.evaluate(() => document.fonts.ready);
await seedPage.screenshot({ path: resolve(root, 'still-3200x1800.png') });
const storageState = await seedContext.storageState({ indexedDB: true });
await seedContext.close();
const toggle = page => page.getByRole('listitem').filter({ hasText: 'Organizar semana de estudos' }).first().getByRole('checkbox');

// B. Browser video: lossless-enough continuous 25 fps test from a prepared session.
const videoContext = await browser.newContext({ ...config, recordVideo: { dir: root, size: { width: 1600, height: 900 } } , storageState });
const videoPage = await videoContext.newPage();
await videoPage.clock.install({ time: new Date('2026-10-07T12:00:00-03:00') });
await ready(videoPage);
const videoCheckbox = toggle(videoPage);
await videoCheckbox.click();
await videoCheckbox.waitFor({ state: 'visible' });
await videoPage.waitForFunction(() => document.querySelector('input[type=checkbox]:checked') !== null);
await videoPage.waitForTimeout(3000);
const video = videoPage.video();
await videoContext.close();
const videoPath = await video.path();

// C. Deterministic frame sequence around the same state change; all frames are full-resolution PNG.
const frameContext = await browser.newContext({ ...config, storageState });
const framePage = await frameContext.newPage();
await framePage.clock.install({ time: new Date('2026-10-07T12:00:00-03:00') });
await ready(framePage);
const frameCheckbox = toggle(framePage);
const frames = [];
for (let index = 0; index < 8; index++) {
  if (index === 3) { await frameCheckbox.click(); await frameCheckbox.waitFor({ state: 'visible' }); }
  await framePage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const file = resolve(root, `sequence-${String(index).padStart(2, '0')}.png`);
  await framePage.screenshot({ path: file });
  frames.push(file);
}
await frameContext.close();

// D. CDP screencast: acknowledge frames and count actual decoded PNG bytes while the same UI changes.
const cdpContext = await browser.newContext({ ...config, storageState });
const cdpPage = await cdpContext.newPage();
await cdpPage.clock.install({ time: new Date('2026-10-07T12:00:00-03:00') });
await ready(cdpPage);
const cdp = await cdpContext.newCDPSession(cdpPage);
const cdpFrames = [];
cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
  const png = Buffer.from(data, 'base64');
  cdpFrames.push(png);
  await cdp.send('Page.screencastFrameAck', { sessionId });
});
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 3200, maxHeight: 1800 });
const cdpCheckbox = toggle(cdpPage);
const cdpCheckboxHandle = await cdpCheckbox.elementHandle();
await cdpCheckbox.check();
await cdpPage.waitForFunction(element => element.checked === true, cdpCheckboxHandle);
await cdpPage.waitForTimeout(750);
await cdpCheckbox.uncheck();
await cdpPage.waitForFunction(element => element.checked === false, cdpCheckboxHandle);
await cdpPage.waitForTimeout(750);
await cdp.send('Page.stopScreencast');
await cdp.detach();
await cdpContext.close();
if (cdpFrames.length) await writeFile(resolve(root, 'cdp-first.png'), cdpFrames[0]);

const sizes = {};
for (const file of [resolve(root, 'still-3200x1800.png'), videoPath, ...frames]) sizes[file.split('/').at(-1)] = (await stat(file)).size;
const videoMeta = await new Promise((resolvePromise, reject) => {
  import('node:child_process').then(({ execFile }) => execFile('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,avg_frame_rate,duration','-show_entries','format=duration,size','-of','json',videoPath], (error, stdout) => error ? reject(error) : resolvePromise(JSON.parse(stdout))));
});
const metrics = {
  preparedState: { page: '/hoje', heading: 'Meu dia', seededActivity: 'Organizar semana de estudos', realAction: 'checkbox checked and unchecked', clock: '2026-10-07 12:00 America/Sao_Paulo' },
  screenshot: { resolution: '3200x1800', bytes: sizes['still-3200x1800.png'], fps: 'n/a; still composed by Remotion' },
  recordVideo: { bytes: sizes[videoPath.split('/').at(-1)], metadata: videoMeta },
  screenshotSequence: { frames: frames.length, bytes: frames.reduce((sum, file) => sum + sizes[file.split('/').at(-1)], 0), framePacing: '2 requestAnimationFrame waits per frame; state transition after frame 2' },
  cdpScreencast: { frames: cdpFrames.length, bytesDecodedPng: cdpFrames.reduce((sum, frame) => sum + frame.length, 0), bytesPerFrame: cdpFrames.map(frame => frame.length), fps: cdpFrames.length / 1.5 },
  assets: sizes,
};
await writeFile(resolve(root, 'spike-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
console.log(JSON.stringify(metrics, null, 2));
