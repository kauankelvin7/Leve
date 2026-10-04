import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { inspect } from '../../scripts/glass/probe';

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

async function tabUntilFocused(page: Page, locator: ReturnType<Page['getByLabel']>, maxTabs: number) {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    if (await locator.evaluate(element => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press('Tab');
  }
  await expect(locator).toBeFocused();
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
      if (view === 'Mês' && viewport.width === 390) {
        await page.getByLabel('Mês', { exact: true }).fill(TEST_DAY.slice(0, 7));
        await page.getByRole('button', { name: /17 de setembro de 2026/ }).click();
        await expect(page.locator('.calendar-agenda.open')).toBeVisible();
        await inspect(page, 'calendar-mobile-sheet');
        await page.locator('.calendar-sheet-close').click();
        await expect(page.locator('.calendar-agenda.open')).toHaveCount(0);
      }
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
  const category = page.getByLabel('Categoria', { exact: true });
  await tabUntilFocused(page, category, 8);
  await expect(category).toBeFocused();
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
    await option.focus();
    await expect(option).toBeFocused();
    if (!(await option.isChecked())) await page.keyboard.press('Space');
    await expect(option).toBeChecked();
    await expect(page.getByText('Aparência salva.', { exact: true })).toBeVisible();
    await openCalendar(page);
    await chooseView(page, 'Dia');
    await axe(page);
    await assertNoGlobalOverflow(page);
  }
});


test('mobile com texto 200% mantém título, tabs e horários inteiros com rolagem interna', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterLocalAgenda(page); await openCalendar(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const headingLines = await page.locator('#page-title').evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element); return range.getClientRects().length;
  });
  expect(headingLines).toBe(1);
  for (const view of ['Mês', 'Semana', 'Dia'] as const) {
    await chooseView(page, view); await assertNoGlobalOverflow(page);
    const tab = page.getByRole('button', { name: view, exact: true });
    expect(await tab.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (view !== 'Mês') {
      const timesFit = await page.locator('.calendar-time-axis span').evaluateAll(elements => elements.every(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        const rects = [...range.getClientRects()], axis = element.parentElement!.getBoundingClientRect();
        return rects.length > 0 && rects.every(rect => Math.abs(rect.y - rects[0]!.y) < .1 && rect.left >= axis.left && rect.right <= axis.right);
      }));
      expect(timesFit).toBe(true);
      const timeline = page.locator('.calendar-time-horizontal');
      expect(await timeline.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await timeline.focus(); await page.keyboard.press('ArrowRight');
      await expect.poll(() => timeline.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
  }
  await page.screenshot({ path: '.cache/glass/after/calendar-day-mobile-text200.png', fullPage: true });
});
