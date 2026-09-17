import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const CHRISTMAS_NOW = Date.parse('2026-12-24T15:00:00.000Z');

async function freezeAtChristmas(page: Page) {
  await page.addInitScript(value => {
    Date.now = () => value;
  }, CHRISTMAS_NOW);
}

async function login(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();

  const activationHeading = page.getByRole('heading', { name: 'Finalize sua agenda' });
  if (await activationHeading.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }

  await expect(page).toHaveURL(/\/hoje/);
  await expect(page.locator('#page-title')).toHaveText('Meu dia');

  const tutorial = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Seu dia no Leve' }) });
  await tutorial.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  if (await tutorial.isVisible().catch(() => false)) {
    await tutorial.getByRole('button', { name: /Pular (guia|tutorial)/ }).click();
    await expect(tutorial).not.toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

test('Natal aparece de forma decorativa, sem bloquear a entrada', async ({ page }) => {
  await freezeAtChristmas(page);
  await page.goto('/entrar');

  const layer = page.locator('.seasonal-layer.seasonal-christmas');
  await expect(layer).toBeVisible();
  await expect(layer).toHaveCSS('pointer-events', 'none');
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('movimento reduzido mantém apenas ambientação estática', async ({ page }) => {
  await freezeAtChristmas(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar');

  await expect(page.locator('.seasonal-layer.seasonal-static')).toBeVisible();
  await expect(page.locator('.seasonal-intro')).toHaveCount(0);
});

test('preferência desligada remove toda a experiência e persiste no perfil', async ({ page }) => {
  await freezeAtChristmas(page);
  await login(page);
  await expect(page.locator('.seasonal-layer.seasonal-christmas')).toBeVisible();

  await page.goto('/configuracoes');
  const toggle = page.getByLabel('Detalhes sazonais', { exact: true });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(page.locator('.seasonal-layer')).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('Detalhes sazonais', { exact: true })).not.toBeChecked();
  await expect(page.locator('.seasonal-layer')).toHaveCount(0);

  await page.getByLabel('Detalhes sazonais', { exact: true }).check();
  await expect(page.locator('.seasonal-layer.seasonal-christmas')).toBeVisible();
});

test('Meu dia e Calendário preservam reflow e marcador sazonal', async ({ page }) => {
  await freezeAtChristmas(page);
  await login(page);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/hoje');
    await expect(page.locator('.seasonal-surface-today')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto('/calendario');
    await expect(page.locator('.seasonal-surface-calendar')).toBeVisible();
    const currentDay = page.locator('.calendar-time-date[aria-current="date"], .calendar-day[aria-current="date"]');
    await expect(currentDay.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
