import { test, expect } from '@playwright/test';
import { inspect, instrument, viewports, setAppearance } from './probe';
for (const [width,height] of viewports) for (const appearance of ['light','dark'] as const) {
  test(`public ${width} ${appearance}`, async ({ page }) => {
    await page.setViewportSize({width,height}); await instrument(page);
    await page.emulateMedia({colorScheme:appearance, reducedMotion:'reduce'});
    for (const route of ['/entrar','/registrar','/recuperar','/privacidade','/apoie']) {
      await page.goto(route); await expect(page.getByRole('heading',{level:1})).toBeVisible();
      await setAppearance(page,appearance);
      await inspect(page, `public-${route.slice(1)}-${width}-${appearance}`);
    }
  });
}
test('production isolation and PWA assets', async ({ page, request }) => {
  for (const route of ['/hoje','/calendario','/notas','/notas/synthetic','/compras','/compras/synthetic','/atividade/synthetic','/revisao','/buscar','/configuracoes','/lixeira']) {
    await page.goto(route); await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByLabel('E-mail')).toBeVisible();
  }
  await page.goto('/dev/gika-character'); await expect(page.locator('.character-review')).toHaveCount(0); await expect(page.locator('.character-review-actor')).toHaveCount(0);
  for (const path of ['/manifest.webmanifest','/sw.js']) expect((await request.get(path)).ok()).toBe(true);
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.start_url).toBeTruthy();
});

test('production service worker caches shell and permits offline reload',async({page,context})=>{
  await page.goto('/entrar'); await expect(page.getByLabel('E-mail')).toBeVisible();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload(); await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async()=>{const names=await caches.keys();return (await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).length))).reduce((a,b)=>a+b,0);});
  expect(cached).toBeGreaterThan(0); await context.setOffline(true);
  try { await page.reload(); await expect(page.getByLabel('E-mail')).toBeVisible(); expect(await page.locator('link[rel="stylesheet"]').count()).toBeGreaterThan(0); }
  finally { await context.setOffline(false); }
});
