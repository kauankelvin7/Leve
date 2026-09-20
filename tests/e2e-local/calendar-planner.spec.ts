import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TEST_DAY = '2026-09-17';
const NEXT_WEEK = '2026-09-24';

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
  const tutorial = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Seu dia no Leve' }) });
  await tutorial.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  if (await tutorial.isVisible().catch(() => false)) {
    await tutorial.getByRole('button', { name: 'Pular guia', exact: true }).click();
    await expect(tutorial).not.toBeVisible();
  }
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

async function chooseDayView(page: Page, date = TEST_DAY) {
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendário', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
  await page.getByLabel('Data', { exact: true }).fill(date);
  await expect(page.locator('.calendar-time-view.day')).toBeVisible();
  await expect(page.locator('.calendar-time-column')).toHaveCount(1);
}

async function setPlannerDate(page: Page, date: string) {
  await page.getByLabel('Data', { exact: true }).fill(date);
  await expect(page.locator('.calendar-time-view.day')).toBeVisible();
}

async function scrollPlannerTo(page: Page, minute: number) {
  await page.locator('.calendar-time-scroll').evaluate((element, targetMinute) => {
    element.scrollTop = Math.max(0, Number(targetMinute) - 150);
  }, minute);
}

async function pointAtMinute(column: Locator, minute: number) {
  return column.evaluate((element, targetMinute) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + Math.max(8, rect.width / 2), y: rect.top + Number(targetMinute) };
  }, minute);
}

async function plannerEvent(page: Page, title: string) {
  const event = page.locator('.calendar-time-event').filter({ hasText: title }).first();
  await expect(event).toBeVisible();
  return event;
}

async function dragPlannerEvent(page: Page, title: string, targetMinute: number) {
  const event = await plannerEvent(page, title);
  await event.hover();
  const handle = event.locator('.calendar-time-move-handle');
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const target = await pointAtMinute(page.locator('.calendar-time-column').first(), targetMinute);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
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
  await expect(page.getByLabel('Tipo')).toHaveValue('event');
  await expect(page.getByLabel('Início', { exact: true })).toHaveValue(TEST_DAY);
  await expect(page.getByLabel('Horário inicial', { exact: true })).toHaveValue('14:00');
  await expect(page.getByLabel('Fim', { exact: true })).toHaveValue(TEST_DAY);
  await expect(page.getByLabel('Horário final', { exact: true })).toHaveValue('15:00');
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function createTimedEvent(page: Page, title: string, startTime: string, endTime: string, weekly = false) {
  await page.goto(`/hoje?dia=${TEST_DAY}&nova=1`);
  await expect(page.locator('.activity-composer')).toBeVisible();
  await page.getByLabel('Tipo').selectOption('event');
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.getByLabel('Início', { exact: true }).fill(TEST_DAY);
  await page.getByLabel('Horário inicial', { exact: true }).fill(startTime);
  await page.getByLabel('Fim', { exact: true }).fill(TEST_DAY);
  await page.getByLabel('Horário final', { exact: true }).fill(endTime);
  if (weekly) {
    await page.getByLabel('Frequência').selectOption('weekly');
    await page.getByLabel(/Até/).fill('2026-10-08');
  }
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
}

async function reconnectOutbox(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
}

test('compromisso de dia inteiro registra tempo, conclui e reaparece concluído no calendário', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterLocalAgenda(page);
  const title = `Dia inteiro ${Date.now()}`;

  await page.goto(`/hoje?dia=${TEST_DAY}&nova=1`);
  await expect(page.locator('.activity-composer')).toBeVisible();
  await page.getByLabel('Tipo').selectOption('event');
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.getByLabel('Compromisso de dia inteiro').check();
  await page.getByLabel('Início', { exact: true }).fill(TEST_DAY);
  await expect(page.getByLabel('Último dia', { exact: true })).toHaveValue(TEST_DAY);
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();

  const row = page.getByRole('listitem').filter({ hasText: title });
  await expect(row).toBeVisible();
  const rowBox = await row.boundingBox();
  const mainBox = await row.locator('.activity-main').boundingBox();
  const actionsBox = await row.locator('.row-actions').boundingBox();
  expect(rowBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(mainBox!.width).toBeGreaterThan(rowBox!.width * 0.8);
  expect(actionsBox!.y).toBeGreaterThan(mainBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 320, height: 720 });
  const narrowRowBox = await row.boundingBox();
  const narrowMainBox = await row.locator('.activity-main').boundingBox();
  expect(narrowRowBox).not.toBeNull();
  expect(narrowMainBox).not.toBeNull();
  expect(narrowMainBox!.width).toBeGreaterThan(narrowRowBox!.width * 0.78);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await row.getByRole('link', { name: title, exact: true }).click();

  await page.getByText('Adicionar tempo manualmente', { exact: true }).click();
  await page.getByLabel('Tempo em minutos').fill('15');
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.locator('.timer-total')).toContainText('15min');

  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText(/Concluída/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Concluída/)).toBeVisible();

  await chooseDayView(page);
  const chip = page.locator('.calendar-time-chip.completed').filter({ hasText: title });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveCSS('text-decoration-line', 'line-through');
});

test('planner cria, move, redimensiona e preserva o fluxo de comando', async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  await chooseDayView(page);
  const title = `Planner E2E ${Date.now()}`;
  await createFromPlanner(page, title);
  await chooseDayView(page);
  await scrollPlannerTo(page, 14 * 60);
  await expect(await plannerEvent(page, title)).toContainText('14:00–15:00');

  await dragPlannerEvent(page, title, 16 * 60);
  await scrollPlannerTo(page, 16 * 60);
  let event = await plannerEvent(page, title);
  await expect(event).toContainText('16:00–17:00');

  await event.hover();
  const resize = event.locator('.calendar-time-resize-handle');
  const box = await resize.boundingBox();
  expect(box).not.toBeNull();
  const target = await pointAtMinute(page.locator('.calendar-time-column').first(), 18 * 60);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  await expect(await plannerEvent(page, title)).toContainText('16:00–18:00');
  expect(pageErrors).toEqual([]);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
});

test('planner pede escopo e cancelar mantém a ocorrência intacta', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  const title = `Série cancelada ${Date.now()}`;
  await createTimedEvent(page, title, '10:00', '11:00', true);
  await chooseDayView(page);
  await scrollPlannerTo(page, 10 * 60);
  await dragPlannerEvent(page, title, 12 * 60);
  const dialog = page.getByRole('dialog', { name: 'Qual parte da repetição deve mudar?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Somente esta ocorrência' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Esta e as próximas' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(await plannerEvent(page, title)).toContainText('10:00–11:00');
});

test('escopos recorrentes separam ocorrência e futuro corretamente', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);

  const occurrenceTitle = `Somente ocorrência ${Date.now()}`;
  await createTimedEvent(page, occurrenceTitle, '08:00', '09:00', true);
  await chooseDayView(page);
  await scrollPlannerTo(page, 8 * 60);
  await dragPlannerEvent(page, occurrenceTitle, 12 * 60);
  let dialog = page.getByRole('dialog', { name: 'Qual parte da repetição deve mudar?' });
  await dialog.getByRole('button', { name: 'Somente esta ocorrência' }).click();
  await expect(page.getByText('Horário atualizado.', { exact: true })).toBeVisible();
  await scrollPlannerTo(page, 12 * 60);
  await expect(await plannerEvent(page, occurrenceTitle)).toContainText('12:00–13:00');
  await setPlannerDate(page, NEXT_WEEK);
  await scrollPlannerTo(page, 8 * 60);
  await expect(await plannerEvent(page, occurrenceTitle)).toContainText('08:00–09:00');

  const futureTitle = `Esta e próximas ${Date.now()}`;
  await createTimedEvent(page, futureTitle, '09:00', '10:00', true);
  await chooseDayView(page);
  await scrollPlannerTo(page, 9 * 60);
  await dragPlannerEvent(page, futureTitle, 13 * 60);
  dialog = page.getByRole('dialog', { name: 'Qual parte da repetição deve mudar?' });
  await dialog.getByRole('button', { name: 'Esta e as próximas' }).click();
  await expect(page.getByText('Este compromisso e os próximos foram atualizados.', { exact: true })).toBeVisible();
  await scrollPlannerTo(page, 13 * 60);
  await expect(await plannerEvent(page, futureTitle)).toContainText('13:00–14:00');
  await setPlannerDate(page, NEXT_WEEK);
  await scrollPlannerTo(page, 13 * 60);
  await expect(await plannerEvent(page, futureTitle)).toContainText('13:00–14:00');
});

test('conflito de revisão mantém o horário confirmado e informa a pessoa', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  await chooseDayView(page);
  const title = `Conflito Planner ${Date.now()}`;
  await createFromPlanner(page, title);
  await chooseDayView(page);
  await scrollPlannerTo(page, 14 * 60);
  await expect(await plannerEvent(page, title)).toContainText('14:00–15:00');
  await page.route('**/api/commands', async route => {
    const request = route.request();
    const payload = request.method() === 'POST' ? request.postDataJSON() as { command?: string } : null;
    if (payload?.command === 'activity.update') {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'REVISION_CONFLICT', message: 'Este item mudou em outra sessão.' }) });
    } else await route.continue();
  });
  await dragPlannerEvent(page, title, 16 * 60);
  await expect(page.getByRole('alert')).toContainText('Este compromisso mudou em outra sessão.');
  await scrollPlannerTo(page, 14 * 60);
  await expect(await plannerEvent(page, title)).toContainText('14:00–15:00');
});

test('alteração offline bloqueia novos gestos até sair da outbox e sincronizar', async ({ context, page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLocalAgenda(page);
  const title = `Offline Planner ${Date.now()}`;
  await createTimedEvent(page, title, '06:00', '07:00');
  await chooseDayView(page);
  await scrollPlannerTo(page, 6 * 60);
  await expect(await plannerEvent(page, title)).toContainText('06:00–07:00');

  await page.evaluate(() => localStorage.setItem('leve.offlineEnabled', 'true'));
  await context.setOffline(true);
  await dragPlannerEvent(page, title, 7 * 60 + 30);
  await expect(page.getByText('Alteração salva neste aparelho. O Planner aguarda a conexão antes de aceitar outro ajuste de horário.', { exact: true })).toBeVisible();

  let event = await plannerEvent(page, title);
  await event.hover();
  await expect(event.locator('.calendar-time-move-handle')).toHaveCount(0);
  await expect(event.locator('.calendar-time-resize-handle')).toHaveCount(0);

  await reconnectOutbox(context, page);
  await scrollPlannerTo(page, 7 * 60 + 30);
  event = await plannerEvent(page, title);
  await expect(event).toContainText('07:30–08:30', { timeout: 20_000 });
  await event.hover();
  await expect(event.locator('.calendar-time-move-handle')).toBeVisible({ timeout: 20_000 });
  await expect(event.locator('.calendar-time-resize-handle')).toBeVisible({ timeout: 20_000 });
});

test('semana fica contida no mobile e a preferência de visualização persiste', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterLocalAgenda(page);
  await page.goto('/calendario');
  await expect(page.getByRole('heading', { level: 1, name: 'Calendário', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await expect(page.locator('.calendar-time-view.week')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.calendar-time-horizontal').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
