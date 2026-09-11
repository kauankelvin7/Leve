import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('entrada destaca a marca e limita o efeito interativo ao desktop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/entrar');
  const brand = page.locator('.auth-brand .brand');
  await expect(brand).toBeVisible();
  expect(await brand.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(100);
  await expect(page.locator('.auth-backdrop canvas')).toBeVisible();
  await page.mouse.move(260, 260); await page.mouse.move(620, 520, { steps: 8 });
  expect(await page.locator('.vite-error-overlay').count()).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'docs/evidence/auth-desktop-interativo.png', fullPage: true });

  await page.goto('/registrar');
  await expect(page.getByRole('heading', { name: 'Crie seu acesso' })).toBeVisible();
  await expect(page.getByLabel('Confirmar senha', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Código do convite')).toBeVisible();
  await page.screenshot({ path: 'docs/evidence/auth-registro-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.auth-backdrop')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/evidence/auth-mobile-estatico.png', fullPage: true });
});

test('rotas reais não recebem dados demonstrativos', async ({ page }) => {
  for (const route of ['/hoje', '/notas/segredo', '/compras', '/configuracoes']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { name: 'Entre na sua agenda' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeEnabled();
    await expect(page.getByText('Revisar o conteúdo da aula')).toHaveCount(0);
  }
});

test('quatro destinos, reload direto e histórico', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto('/demo/hoje');
  for (const name of ['Calendário', 'Notas', 'Compras', 'Meu dia']) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
  }
  await page.goto('/demo/calendario?dia=2028-02-29');
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page).toHaveURL(/dia=2028-03-01/);
  await page.goBack();
  await expect(page).toHaveURL(/dia=2028-02-29/);
  expect(errors).toEqual([]);
});

test('formulário, Escape, foco, texto seguro e estado somente em memória', async ({ page }) => {
  await page.goto('/demo/hoje');
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await expect(page.getByLabel('Título')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Adicionar tarefa', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  await page.getByLabel('Título').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Adicionar ao exemplo' }).click();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  await expect(page.locator('.activity-list img')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('calendário por teclado e parâmetros inválidos', async ({ page }) => {
  await page.goto('/demo/calendario?dia=2028-02-29');
  const selected = page.locator('[data-date="2028-02-29"]');
  await selected.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-date="2028-03-01"]')).toBeFocused();
  await expect(page).toHaveURL(/dia=2028-03-01/);
  await page.goto('/demo/hoje?dia=2026-02-30&categoria=invalid');
  await expect(page.getByText('Revisar o conteúdo da aula', { exact: true })).toBeVisible();
});

test('modo sólido e compras sem persistência', async ({ page }) => {
  await page.goto('/demo/configuracoes');
  await page.getByLabel('Reduzir transparência', { exact: false }).check();
  await expect(page.locator('.app-shell')).toHaveClass(/solid/);
  await page.getByRole('navigation').getByRole('link', { name: 'Compras' }).click();
  await page.getByRole('checkbox', { name: /Arroz/ }).check();
  await expect(page.getByRole('status')).toHaveText('1 item para comprar.');
});

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`layout sem rolagem horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo/hoje');
    await expect(page.getByRole('heading', { name: 'Meu dia', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('navigation')).toBeVisible();
  });
}

test('acessibilidade automatizada dos destinos e diálogo', async ({ page }) => {
  for (const route of ['hoje', 'calendario', 'notas', 'compras', 'configuracoes']) {
    await page.goto(`/demo/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  }
  await page.goto('/demo/hoje');
  await page.getByRole('button', { name: 'Adicionar tarefa', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
