import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('paletas acompanham navegação e calendário funciona em desktop e celular', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.goto('/configuracoes');
  for (const [label, color] of [['Roxo suave', 'rgb(112, 85, 134)'], ['Azul suave', 'rgb(69, 107, 139)'], ['Vermelho suave', 'rgb(146, 86, 95)'], ['Verde suave', 'rgb(77, 104, 92)']]) {
    await page.getByLabel(label!, { exact: true }).click();
    await expect(page.getByLabel(label!, { exact: true })).toBeChecked();
    await expect(page.locator('.profile-link')).toHaveCSS('color', color!);
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
  await page.getByRole('link', { name: '+ Nova atividade', exact: true }).click();
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
    }
  }
});
