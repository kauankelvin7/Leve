import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolatedTestAccount } from '../helpers/gikaBatch';

test.use({ timezoneId: 'America/Sao_Paulo' });

test('dia consultado fica explícito e voltar para hoje respeita o fuso da conta', async ({ page }) => {
  const email = await isolatedTestAccount('today-date-clarity');
  // UTC já é dia 8; São Paulo ainda está na quarta-feira, dia 7.
  await page.clock.install({ time: new Date('2026-10-08T01:30:00Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await page.goto('/configuracoes');
  for (const name of ['Cacau', 'Escuro']) {
    const radio = page.getByRole('radio', { name, exact: true });
    if (!(await radio.isChecked())) {
      const saved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
      await radio.click();
      await saved;
    }
  }
  await page.goto('/hoje');
  await page.evaluate(async () => {
    const path = '/src/platform/api.ts';
    const { sendCommand } = await import(/* @vite-ignore */ path);
    for (const title of ['Revisar anotações', 'Passar na feira']) await sendCommand({
      command: 'activity.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0,
      payload: { title, descriptionPlain: '', categoryId: null, colorHex: null, estimatedMinutes: null, reminderSpecs: [],
        schedule: { type: 'task', dueDate: '2026-10-08', dueTime: null, timeZone: 'America/Sao_Paulo', disambiguation: 'reject' } },
    });
  });
  const overview = page.getByRole('region', { name: 'Resumo do dia selecionado', exact: true });
  const week = page.getByRole('region', { name: 'Sua semana', exact: true });
  await expect(overview).toContainText('quarta-feira');
  await week.getByRole('button', { name: /quinta-feira, 8 de outubro de 2026/ }).click();
  await expect(overview).toContainText('Amanhã');
  await expect(overview).toContainText('quinta-feira');
  await expect(week.locator('[aria-current="date"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(week.getByRole('button', { name: /quinta-feira, 8 de outubro/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(overview).toContainText('2 tarefas neste dia');
  await page.evaluate(() => document.fonts.ready);
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.screenshot({ path: '/tmp/leve-date-clarity-desktop.png' });
  expect((await new AxeBuilder({ page }).include('section[aria-label="Resumo do dia selecionado"]').analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/leve-date-clarity-mobile.png' });
  expect((await new AxeBuilder({ page }).include('section[aria-label="Resumo do dia selecionado"]').analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(overview.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Voltar para hoje', exact: true })).toHaveCount(0);
  await week.getByRole('button', { name: /sexta-feira, 9 de outubro de 2026/ }).click();
  await expect(overview.getByText('Dia selecionado', { exact: true })).toBeVisible();
  await week.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(overview.getByText('Hoje', { exact: true })).toBeVisible();
  await expect(overview).toContainText('quarta-feira');
  await expect(overview.getByText('Dia selecionado', { exact: true })).toHaveCount(0);
  await expect(week.locator('[aria-current="date"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(overview).toContainText('quarta-feira');
});
