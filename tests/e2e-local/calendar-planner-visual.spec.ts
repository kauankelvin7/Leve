import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TEST_DAY = '2026-09-17';
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;

async function enterLocalAgenda(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  const tutorial = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Seu dia no Leve' }) });
  await tutorial.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  if (await tutorial.isVisible().catch(() => false)) {
    await tutorial.getByRole('button', { name: 'Pular guia', exact: true }).click();
  }
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

async function openCalendar(page: Page) {
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendário', exact: true })).toBeVisible();
}

async function assertNoGlobalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function chooseView(page: Page, label: 'Mês' | 'Semana' | 'Dia') {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (label !== 'Mês') {
    await page.getByLabel('Data', { exact: true }).fill(TEST_DAY);
    await expect(page.locator(`.calendar-time-view.${label === 'Semana' ? 'week' : 'day'}`)).toBeVisible();
  } else {
    await expect(page.locator('.calendar-panel')).toBeVisible();
  }
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
}

test('Mês, Semana e Dia permanecem contidos nos seis viewports de homologação', async ({ page }) => {
  test.setTimeout(150_000);
  await enterLocalAgenda(page);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openCalendar(page);
    for (const view of ['Mês', 'Semana', 'Dia'] as const) {
      await chooseView(page, view);
      await assertNoGlobalOverflow(page);
      if (view === 'Semana' && viewport.width <= 430) {
        expect(await page.locator('.calendar-time-horizontal').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      }
    }
  }
});

test('planner passa Axe em desktop e mobile nas três visualizações', async ({ page }) => {
  test.setTimeout(120_000);
  await enterLocalAgenda(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openCalendar(page);
    for (const view of ['Mês', 'Semana', 'Dia'] as const) {
      await chooseView(page, view);
      await axe(page);
    }
  }
});

test('controles principais do calendário são alcançáveis por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  await openCalendar(page);
  const month = page.getByRole('button', { name: 'Mês', exact: true });
  await month.focus();
  await expect(month).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Semana', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Dia', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Dia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Data', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Categoria', { exact: true })).toBeFocused();
});

test('planner respeita movimento reduzido e continua utilizável', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await enterLocalAgenda(page);
  await openCalendar(page);
  await chooseView(page, 'Semana');
  await assertNoGlobalOverflow(page);
  await expect(page.locator('.calendar-time-view.week')).toBeVisible();
  await axe(page);
});

test('calendário mantém contraste automatizado em claro e escuro', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);

  for (const appearance of ['Escuro', 'Claro'] as const) {
    await page.goto('/configuracoes');
    await expect(page.getByRole('heading', { level: 1, name: 'Preferências', exact: true })).toBeVisible();
    const option = page.getByRole('radio', { name: appearance, exact: true });
    await option.check();
    await expect(page.getByText('Aparência salva.', { exact: true })).toBeVisible();
    await openCalendar(page);
    await chooseView(page, 'Dia');
    await axe(page);
    await assertNoGlobalOverflow(page);
  }
});
