import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { colorThemeIds } from '../../packages/domain/src/themes';
import { isolatedTestAccount } from '../helpers/gikaBatch';

async function login(page: Page) {
  const email = await isolatedTestAccount('agenda-opening');
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await saved;
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
}

async function pauseSession(page: Page) {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const handler = async (route: Route) => {
    await waiting;
    await route.continue();
  };
  await page.route('**/api/session', handler);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Preparando sua agenda…', exact: true })).toBeVisible();
  return async () => {
    release();
    await expect(page.locator('#page-title')).toHaveText('Meu dia');
    await expect(page.getByRole('status').filter({ hasText: 'Preparando sua agenda…' })).toHaveCount(0);
    await page.unroute('**/api/session', handler);
  };
}

test('abertura real da agenda mantém composição e contraste em todas as paletas', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);

  for (const appearance of ['light', 'dark']) {
    for (const palette of colorThemeIds) {
      // The initial screen consumes the last saved appearance before the session arrives.
      await page.evaluate(({ appearance, palette }) => {
        localStorage.setItem('leve.appearance', appearance);
        localStorage.setItem('leve.colorTheme', palette);
      }, { appearance, palette });
      const resume = await pauseSession(page);
      try {
        await expect(page.locator('html')).toHaveAttribute('data-appearance', appearance);
        await expect(page.locator('html')).toHaveAttribute('data-theme', palette);
        await expect(page.getByRole('status')).toHaveCount(1);
        await expect(page.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
        await expect(page.getByRole('progressbar')).toHaveCount(0);
        await expect(page.getByRole('main').locator('svg')).toHaveAttribute('aria-hidden', 'true');
        for (const width of [320, 390, 1366]) {
          await page.setViewportSize({ width, height: 844 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${palette}/${appearance}/${width}`).toBe(true);
          const screen = await page.getByRole('main').boundingBox();
          expect(screen!.height).toBeGreaterThanOrEqual(844);
          const message = await page.getByRole('status').boundingBox();
          expect(message!.x).toBeGreaterThanOrEqual(0);
          expect(message!.x + message!.width).toBeLessThanOrEqual(width);
          if ((width === 390 && palette === 'green' && appearance === 'light')
            || (width === 390 && palette === 'orange' && appearance === 'dark')
            || (width === 1366 && palette === 'purple' && appearance === 'light')) {
            await expect(page).toHaveScreenshot(`agenda-opening-${palette}-${appearance}-${width}.png`, { animations: 'disabled' });
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        expect((await new AxeBuilder({ page }).analyze()).violations, `${palette}/${appearance}`).toEqual([]);
      } finally {
        await resume();
      }
    }
  }
});

test('abertura respeita movimento reduzido e texto ampliado e as rotas preservam o shell', async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const resume = await pauseSession(page);
  try {
    expect(await page.getByRole('main').evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
    expect(await page.getByRole('main').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.getByRole('status').evaluate(element => {
      const container = element.getBoundingClientRect();
      return [...element.querySelectorAll('h1, p')].every(text => {
        const range = document.createRange();
        range.selectNodeContents(text);
        return [...range.getClientRects()].every(rect => rect.left >= container.left && rect.right <= container.right);
      });
    })).toBe(true);
    await page.getByRole('status').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Preparando sua agenda…' })).toBeInViewport();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.evaluate(() => { document.documentElement.style.removeProperty('font-size'); });
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await expect(page.getByRole('heading', { name: 'Preparando sua agenda…' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    await resume();
  }

  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none', contrast: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/features/notes/Notes.tsx*', async route => {
    await waiting;
    await route.continue();
  });
  // A fresh route load exposes the inner Suspense fallback. Client navigation
  // may keep the previous page visible during React's transition instead.
  await page.goto('/notas');
  try {
    await expect(page.getByText('Abrindo sua página…', { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preparando sua agenda…' })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator('#page-title')).toHaveText('Notas');
  await expect(page.locator('#page-title')).toBeFocused();
});
