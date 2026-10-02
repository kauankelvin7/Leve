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
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) {
    const guideSaved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
    await skip.click(); await guideSaved;
  }
  await page.goto('/configuracoes');
  if (await page.getByLabel('Reduzir transparência', { exact: true }).isChecked()) {
    await page.getByLabel('Reduzir transparência', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Salvar preferências' }).click();
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
  await page.getByRole('button', { name: 'Mês', exact: true }).click();
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
  for (const [width, height] of [[390, 844], [853, 1280], [1024, 768], [1366, 768], [1920, 1080], [2560, 1440]] as const) {
    await page.setViewportSize({ width, height });
    for (const [route, label] of [['/hoje', 'Meu dia'], ['/calendario', 'Calendário'], ['/notas', 'Notas'], ['/compras', 'Compras'], ['/buscar', 'Buscar'], ['/lixeira', 'Lixeira'], ['/configuracoes', 'Perfil e preferências']] as const) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(route + '$'));
      await expect(page.locator('#page-title')).toHaveText(route === '/configuracoes' ? 'Preferências' : label);
      await page.locator('.sidebar').evaluate(async element => {
        await Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(axe.violations, `${width}px ${route}`).toEqual([]);
      if (route === '/configuracoes') {
        expect.soft(await page.locator('.avatar-picker').evaluate(fieldset => {
          const bounds = fieldset.getBoundingClientRect();
          return [...fieldset.querySelectorAll('button, .avatar-options label')].every(element => {
            const item = element.getBoundingClientRect();
            return item.left >= bounds.left && item.right <= bounds.right;
          });
        }), `avatar controls contained at ${width}px`).toBe(true);
      }
      if (['/hoje', '/calendario', '/configuracoes'].includes(route)) await page.screenshot({ path: 'test-results/glass-' + route.slice(1) + '-' + width + '.png', fullPage: true });
    }
  }
  await page.goto('/configuracoes');
  await page.getByLabel('Reduzir transparência', { exact: true }).check();
  await page.getByRole('button', { name: 'Salvar preferências' }).click();
  await expect(page.locator('.sidebar')).toHaveCSS('backdrop-filter', 'none');
  await page.reload();
  await expect(page.getByLabel('Reduzir transparência', { exact: true })).toBeChecked();
  expect(await page.locator('.sidebar').evaluate(element => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3];
  })).toBe(255);
  await page.getByLabel('Reduzir transparência', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Salvar preferências' }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/solid/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.getByRole('link', { name: 'Meu dia', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  expect(await page.locator('.day-picker:not(.month-picker) strong').evaluateAll(elements => elements.every(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length === 1;
  })), 'day numbers stay whole at 200% text size').toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
