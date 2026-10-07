import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { Temporal } from '@js-temporal/polyfill';
import { isolatedTestAccount } from '../helpers/gikaBatch';

test('repetição anual e personalizada usam modal; avisos ampliados persistem sem horário de aviso na tela', async ({ page }) => {
  const email = await isolatedTestAccount('recurrence-options');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
  const date = Temporal.Now.plainDateISO('America/Sao_Paulo').add({ days: 10 }).toString();

  for (const frequency of ['yearly', 'custom']) {
    await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill(`Rotina ${frequency}`);
    await page.getByLabel('Data', { exact: true }).fill(date);
    await page.locator('.activity-composer .optional-fields > summary').click();
    await expect(page.locator('[name=dayReminderTime]')).toHaveCount(0);
    await expect(page.locator('.activity-composer')).not.toContainText('00:00');
    const trigger = page.getByRole('button', { name: /Repetir atividade/ });
    await trigger.click();
    let dialog = page.getByRole('dialog', { name: 'Repetir atividade', exact: true });
    await expect(dialog.getByRole('button', { name: 'Não se repete', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: '/tmp/leve-recurrence-options.png' });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    dialog = page.getByRole('dialog', { name: 'Repetir atividade', exact: true });
    await dialog.getByRole('button', { name: frequency === 'yearly' ? 'Todos os anos' : 'Personalizar…', exact: true }).click();
    await expect(trigger).toBeFocused();
    if (frequency === 'custom') {
      await page.getByLabel('Repetir a cada', { exact: true }).fill('2');
      await page.getByRole('combobox', { name: 'Unidade da repetição', exact: true }).selectOption('weekly');
    }
    await page.getByRole('combobox', { name: 'Termina', exact: true }).selectOption('count');
    await page.getByLabel('Quantidade de ocorrências').fill('3');
    for (let index = 1; index <= 3; index++) await page.getByRole('button', { name: 'Adicionar aviso antecipado', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Adicionar aviso antecipado', exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Aviso antecipado 1', exact: true }).selectOption('10');
    await page.getByRole('combobox', { name: 'Aviso antecipado 2', exact: true }).selectOption('10080');
    await page.getByRole('combobox', { name: 'Aviso antecipado 3', exact: true }).selectOption('custom');
    await page.getByRole('combobox', { name: 'Unidade do aviso 3', exact: true }).selectOption('1440');
    await page.getByLabel('Antecedência 3', { exact: true }).fill('3');
    const ack = page.waitForResponse(response => response.url().endsWith('/api/commands') && response.request().postDataJSON()?.command === 'activity.createSeries');
    await page.getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
    const response = await ack;
    expect(response.status()).toBe(200);
    const payload = response.request().postDataJSON().payload;
    expect(payload.recurrence).toMatchObject({ frequency: frequency === 'yearly' ? 'yearly' : 'weekly', interval: frequency === 'yearly' ? 1 : 2, count: 3, until: null });
    expect(payload.activity.reminderSpecs.map((spec: { minutesBefore: number }) => spec.minutesBefore)).toEqual([10, 10080, 4320]);
    expect(payload.activity).not.toHaveProperty('dayReminderTime');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
