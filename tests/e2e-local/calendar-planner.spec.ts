import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TEST_DAY = '2026-09-17';

async function enterLocalAgenda(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();

  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }

  await expect(page).toHaveURL(/\/hoje/);
  const dismissGuide = page.getByRole('button', { name: /Pular (guia|tutorial)/i });
  if (await dismissGuide.count() && await dismissGuide.first().isVisible()) await dismissGuide.first().click();
}

async function chooseDayView(page: Page) {
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
  await page.getByLabel('Data', { exact: true }).fill(TEST_DAY);
  await expect(page.locator('.calendar-time-view.day')).toBeVisible();
  await expect(page.locator('.calendar-time-column')).toHaveCount(1);
}

async function scrollPlannerTo(page: Page, minute: number) {
  await page.locator('.calendar-time-scroll').evaluate((element, targetMinute) => {
    element.scrollTop = Math.max(0, Number(targetMinute) - 150);
  }, minute);
}

async function pointAtMinute(column: Locator, minute: number) {
  return column.evaluate((element, targetMinute) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + Math.max(8, rect.width / 2),
      y: rect.top + Number(targetMinute),
    };
  }, minute);
}

async function createFromPlanner(page: Page, title: string) {
  await scrollPlannerTo(page, 14 * 60);
  const column = page.locator('.calendar-time-column').first();
  const start = await pointAtMinute(column, 14 * 60);
  const end = await pointAtMinute(column, 15 * 60);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await page.mouse.up();

  await expect(page).toHaveURL(/\/hoje\?/);
  await expect(page.locator('.activity-composer')).toBeVisible();
  await expect(page.getByLabel('Tipo', { exact: true })).toHaveValue('event');
  await expect(page.getByLabel('Início', { exact: true })).toHaveValue(TEST_DAY);
  await expect(page.getByLabel('Horário', { exact: true })).toHaveValue('14:00');
  await expect(page.getByLabel('Fim', { exact: true })).toHaveValue(TEST_DAY);
  await expect(page.getByLabel('Horário final', { exact: true })).toHaveValue('15:00');

  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function plannerEvent(page: Page, title: string) {
  const event = page.locator('.calendar-time-event').filter({ hasText: title }).first();
  await expect(event).toBeVisible();
  return event;
}

test('planner cria, move, redimensiona e preserva o fluxo de comando', async ({ page }) => {
  test.setTimeout(150_000);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  await chooseDayView(page);

  const title = `Planner E2E ${Date.now()}`;
  await createFromPlanner(page, title);

  await chooseDayView(page);
  await scrollPlannerTo(page, 14 * 60);
  let event = await plannerEvent(page, title);
  await expect(event).toContainText('14:00–15:00');

  await event.hover();
  const moveHandle = event.locator('.calendar-time-move-handle');
  await expect(moveHandle).toBeVisible();
  const moveBox = await moveHandle.boundingBox();
  expect(moveBox).not.toBeNull();
  const column = page.locator('.calendar-time-column').first();
  const moveTarget = await pointAtMinute(column, 16 * 60);
  await page.mouse.move(moveBox!.x + moveBox!.width / 2, moveBox!.y + moveBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(moveTarget.x, moveTarget.y, { steps: 8 });
  await page.mouse.up();

  await scrollPlannerTo(page, 16 * 60);
  event = await plannerEvent(page, title);
  await expect(event).toContainText('16:00–17:00');

  await event.hover();
  const resizeHandle = event.locator('.calendar-time-resize-handle');
  await expect(resizeHandle).toBeVisible();
  const resizeBox = await resizeHandle.boundingBox();
  expect(resizeBox).not.toBeNull();
  const resizeTarget = await pointAtMinute(column, 18 * 60);
  await page.mouse.move(resizeBox!.x + resizeBox!.width / 2, resizeBox!.y + resizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizeTarget.x, resizeTarget.y, { steps: 8 });
  await page.mouse.up();

  await expect(await plannerEvent(page, title)).toContainText('16:00–18:00');
  expect(pageErrors).toEqual([]);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});

test('planner pede escopo antes de alterar uma ocorrência recorrente', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);

  const title = `Série Planner ${Date.now()}`;
  await page.goto(`/hoje?dia=${TEST_DAY}&nova=1`);
  await page.getByLabel('Tipo', { exact: true }).selectOption('event');
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.getByLabel('Início', { exact: true }).fill(TEST_DAY);
  await page.getByLabel('Horário', { exact: true }).fill('10:00');
  await page.getByLabel('Fim', { exact: true }).fill(TEST_DAY);
  await page.getByLabel('Horário final', { exact: true }).fill('11:00');
  await page.getByLabel('Frequência', { exact: true }).selectOption('weekly');
  await page.getByLabel(/Até/).fill('2026-10-08');
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();

  await chooseDayView(page);
  await scrollPlannerTo(page, 10 * 60);
  const event = await plannerEvent(page, title);
  await event.hover();
  const moveHandle = event.locator('.calendar-time-move-handle');
  const moveBox = await moveHandle.boundingBox();
  expect(moveBox).not.toBeNull();
  const target = await pointAtMinute(page.locator('.calendar-time-column').first(), 12 * 60);
  await page.mouse.move(moveBox!.x + moveBox!.width / 2, moveBox!.y + moveBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: 'Qual parte da repetição deve mudar?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Somente esta ocorrência' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Esta e as próximas' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(await plannerEvent(page, title)).toContainText('10:00–11:00');
});

test('semana fica contida no mobile e a preferência de visualização persiste', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterLocalAgenda(page);
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.locator('.calendar-time-view.week')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.calendar-time-horizontal').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
