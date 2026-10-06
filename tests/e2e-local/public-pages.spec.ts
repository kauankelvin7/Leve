import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('páginas públicas, termos e estados de erro mantêm composição responsiva', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });

  for (const [path, title] of [
    ['/rota-inexistente', 'Este caminho não leva a lugar nenhum.'],
    ['/privacidade', 'Privacidade no Leve'],
    ['/termos', 'Termos de uso do Leve'],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('#page-title')).toHaveText(title);
    expect(await new AxeBuilder({ page }).analyze()).toEqual(expect.objectContaining({ violations: [] }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page).toHaveScreenshot(`${path === '/rota-inexistente' ? 'not-found' : path.slice(1)}-desktop.png`, {
      fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rota-inexistente');
  await expect(page.locator('#page-title')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page).toHaveScreenshot('not-found-mobile.png', {
    fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
  });
});
