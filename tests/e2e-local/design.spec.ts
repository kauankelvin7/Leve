import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('paletas acompanham navegação e calendário funciona em desktop e celular', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await expect(page.getByRole('button', { name: /Pular (guia|tutorial)/ })).toBeVisible();
  const guideSaved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
  await page.getByRole('button', { name: /Pular (guia|tutorial)/ }).click();
  await guideSaved;
  await page.goto('/configuracoes');
  if (await page.getByLabel('Reduzir transparência', { exact: true }).isChecked()) {
    await page.getByLabel('Reduzir transparência', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Salvar perfil' }).click();
    await expect(page.locator('.form-status')).toHaveText('Preferências salvas.');
    await expect(page.locator('.app-shell')).not.toHaveClass(/solid/);
  }
  for (const label of ['Roxo suave', 'Azul suave', 'Vermelho suave', 'Verde suave']) {
    await page.getByLabel(label, { exact: true }).click();
    await expect(page.getByLabel(label, { exact: true })).toBeChecked();
    const colors = await page.locator('.sidebar').evaluate(element => {
      const probe = document.createElement('span');
      probe.style.background = getComputedStyle(document.documentElement).getPropertyValue('--ink-surface');
      document.body.append(probe);
      const theme = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { sidebar: getComputedStyle(element).backgroundColor, theme };
    });
    expect(colors.sidebar).toBe(colors.theme);
  }
  await page.getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('.calendar-day')).toHaveCount(42);
  await expect(page.getByText('Carregando o mês…')).not.toBeVisible();
  const initial = await page.getByLabel('Mês', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
  await expect(page.getByLabel('Mês', { exact: true })).not.toHaveValue(initial);
  await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
  await expect(page.getByLabel('Mês', { exact: true })).toHaveValue(initial);
  await page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await page.getByRole('link', { name: 'Nova atividade', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Data', { exact: true })).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/hoje', '/calendario', '/notas', '/compras', '/buscar', '/lixeira', '/configuracoes']) {
      await page.goto(route);
      await expect(page.locator('#page-title')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations, `${width}px ${route}`).toEqual([]);
      if (['/hoje', '/calendario', '/configuracoes'].includes(route)) await page.screenshot({ path: 'test-results/glass-' + route.slice(1) + '-' + width + '.png', fullPage: true });
    }
  }
  await page.goto('/configuracoes');
  await page.getByLabel('Reduzir transparência', { exact: true }).check();
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.locator('.sidebar')).toHaveCSS('backdrop-filter', 'none');
  await page.reload();
  await expect(page.getByLabel('Reduzir transparência', { exact: true })).toBeChecked();
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', /^rgb\(/);
  await page.getByLabel('Reduzir transparência', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/solid/);
});
