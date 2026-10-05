import { expect, test } from '@playwright/test';
import { Temporal } from '@js-temporal/polyfill';

test('committed creation supplies minimal context for a follow-up, never command identity or grants', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
  const date = Temporal.Now.plainDateISO('America/Sao_Paulo').add({ days: 1 }).toString();
  const title = 'Leitura contexto ' + Date.now();
  let calls = 0;
  let originalId = '';
  await page.route('**/api/gika/respond', route => {
    const body = route.request().postDataJSON();
    calls++;
    if (calls === 1) {
      originalId = body.requestId;
      return route.fulfill({ json: { text: 'Preparando…', simulated: false, reads: [],
        createTask: { title, dueDate: date, dueTime: '19:00', timeZone: 'America/Sao_Paulo' } } });
    }
    expect(body.text).toBe('então muda o nome dessa tarefa');
    expect(body.conversation).toHaveLength(2);
    const history = JSON.stringify(body.conversation);
    expect(history).toContain(title);
    expect(history).toContain(date);
    expect(history).toContain('19:00');
    expect(history).toContain('created');
    expect(history).not.toContain(originalId);
    expect(history).not.toMatch(/token|revision|operationId|entityId/);
    return route.fulfill({ json: { text: 'Qual será o novo nome?', simulated: false, reads: [], intent: 'conversation' } });
  });
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill(`Agenda ${title} amanhã às sete da noite`); await input.press('Enter');
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toContainText(title);
  await input.fill('então muda o nome dessa tarefa'); await input.press('Enter');
  await expect(page.locator('.gika-message.is-assistant').last()).toContainText('Qual será o novo nome?');
  expect(calls).toBe(2);
});

test('confirmed reschedule supplies the checked new date to the next turn instead of a pending preview', async ({ page }) => {
  const { sealedRescheduleFixture } = await import('../helpers/gikaConfirmation');
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
  const originalDate = Temporal.Now.plainDateISO('America/Sao_Paulo').toString();
  const newDate = Temporal.PlainDate.from(originalDate).add({ days: 1 }).toString();
  const title = 'Caminhada contexto ' + Date.now();
  let calls = 0, entityId = '';
  await page.route('**/api/gika/respond', async route => {
    const body = route.request().postDataJSON(); calls++;
    if (calls === 1) {
      entityId = body.requestId;
      return route.fulfill({ json: { text: 'Preparando…', simulated: false, reads: [],
        createTask: { title, dueDate: originalDate, dueTime: '07:00', timeZone: 'America/Sao_Paulo' } } });
    }
    if (calls === 2) return route.fulfill({ json: await sealedRescheduleFixture(page, body, {
      id: entityId, title, dueDate: originalDate, dueTime: '07:00', timeZone: 'America/Sao_Paulo', revision: 1, patch: { dueDate: newDate },
    }) });
    const previous = body.conversation.at(-1).text;
    expect(previous).toContain('confirmed'); expect(previous).toContain(newDate);
    expect(previous).not.toContain(originalDate); expect(previous).not.toContain(entityId);
    expect(previous).not.toMatch(/preview_only|revision|token/);
    return route.fulfill({ json: { text: 'Qual será o novo nome?', simulated: false, reads: [], intent: 'conversation' } });
  });
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill(`Agenda ${title} hoje às sete da manhã`); await input.press('Enter');
  await expect(page.getByRole('group', { name: 'Tarefa adicionada', exact: true })).toContainText(title);
  await input.fill('Então faz amanhã'); await input.press('Enter');
  await page.getByRole('button', { name: 'Mover tarefa', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Tarefa reagendada', exact: true })).toContainText(newDate.split('-').reverse().join('/'));
  await input.fill('Agora muda o nome dessa tarefa'); await input.press('Enter');
  await expect(page.locator('.gika-message.is-assistant').last()).toContainText('Qual será o novo nome?');
  expect(calls).toBe(3);
});
