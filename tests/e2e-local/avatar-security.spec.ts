import { expect, test } from '@playwright/test';

for (const mobile of [false, true]) test(`avatar security patch: ${mobile ? 'mobile dark' : 'desktop light'} rendering and profile command survive reload`, async ({ page }) => {
  if (mobile) { await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); }
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.name));
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
    const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'profile.completeTutorial');
    await skip.click(); await ack;
  }
  await page.goto('/configuracoes');
  const profile = page.locator('#settings-profile');
  const images = profile.locator('.avatar-options img');
  await expect(images).toHaveCount(6);
  await expect.poll(() => images.evaluateAll(nodes => nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await profile.getByRole('button', { name: 'Ver outras opções', exact: true }).click();
  const choice = profile.locator('input[name="avatarSeed"]').nth(1); await choice.check();
  const seed = await choice.inputValue();
  const selectedSource = await choice.locator('..').locator('img').getAttribute('src');
  expect(selectedSource).toMatch(/^data:image\/svg\+xml;/);
  const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'profile.update');
  await profile.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
  const response = await ack; expect(response.status()).toBe(200);
  expect(response.request().postDataJSON().payload).toMatchObject({ avatarStyle: 'avataaars', avatarSeed: seed });
  expect(await response.json()).toMatchObject({ result: 'applied' });
  await page.reload();
  await expect(profile.locator('input[name="avatarSeed"]:checked')).toHaveValue(seed);
  await expect(profile.locator('input[name="avatarSeed"]:checked').locator('..').locator('img')).toHaveAttribute('src', selectedSource!);
  await expect.poll(() => profile.locator('input[name="avatarSeed"]:checked').locator('..').locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
