import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolatedTestAccount } from '../helpers/gikaBatch';

async function login(page: Page) {
  const email = await isolatedTestAccount('mobile-design');
  // Keep client command timestamps within the server's 72-hour anti-replay window.
  await page.clock.install({ time: new Date() });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await saved;
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
}

async function appearance(page: Page, mode: string, palette: string) {
  await page.goto('/configuracoes');
  for (const name of [mode, palette]) {
    const radio = page.getByRole('radio', { name, exact: true });
    if (!(await radio.isChecked())) {
      const saved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
      await radio.click();
      await saved;
    }
  }
}

test('menu Mais mantém ações separadas, teclado e toque fora em todos os tamanhos', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  for (const [mode, palette] of [['Claro', 'Verde suave'], ['Escuro', 'Terracota']] as const) {
    await appearance(page, mode, palette);
    for (const width of [320, 390, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/compras');
      const trigger = page.locator('summary[aria-label="Mais páginas"]');
      const menu = page.getByRole('navigation', { name: 'Mais páginas' });
      await trigger.click();
      const rows = await menu.getByRole('link').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
      expect(rows).toHaveLength(2);
      expect(rows.every(row => row.height >= 44 && row.width >= 160)).toBe(true);
      expect(rows[0].bottom).toBeLessThanOrEqual(rows[1].top);
      expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(0);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
      if (width === 390) await expect(page).toHaveScreenshot(`menu-${mode === 'Claro' ? 'light' : 'terracotta-dark'}.png`, { animations: 'disabled' });
      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.mouse.click(2, 2);
      await expect(menu).not.toBeVisible();
      await trigger.click();
      await menu.getByRole('link', { name: 'Revisão', exact: true }).click();
      await expect(page.locator('#page-title')).toHaveText('Revisão');
      await expect(menu).not.toBeVisible();
      if (width < 740) {
        const navigation = page.getByRole('navigation', { name: 'Principal' });
        for (const label of ['Meu dia', 'Calendário', 'Notas', 'Compras', 'Gika']) await expect(navigation.getByText(label, { exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/compras');
  await expect(page.getByRole('region', { name: 'Resumo das compras' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    const counter = document.querySelectorAll('.shopping-overview strong').item(1);
    if (!counter) throw new Error('Resumo de compras indisponível.');
    counter.textContent = '10000';
  });
  expect(await page.getByRole('region', { name: 'Resumo das compras' }).locator('strong').evaluateAll(elements => elements.every(element => {
    const cell = element.parentElement!.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(element);
    return [...range.getClientRects()].every(rect => rect.left >= cell.left && rect.right <= cell.right && rect.bottom <= cell.bottom);
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('compras e notas priorizam conteúdo salvo e criar ou editar mantém o foco no formulário', async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/compras');
  await page.getByRole('button', { name: 'Nova lista', exact: true }).click();
  await expect(page.getByLabel('Nome da lista', { exact: true })).toBeFocused();
  await page.getByLabel('Nome da lista', { exact: true }).fill('Mercado da semana');
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Mercado da semana');
  await page.goto('/compras');
  const list = page.locator('.shopping-list-card').filter({ hasText: 'Mercado da semana' });
  await expect(list).toBeVisible();
  expect((await list.boundingBox())!.y).toBeLessThan((await page.getByTestId('shopping-list-composer').boundingBox())!.y);
  expect((await page.getByRole('region', { name: 'Resumo das compras' }).boundingBox())!.height).toBeLessThanOrEqual(120);
  await expect(page).toHaveScreenshot('shopping-content-mobile.png', { animations: 'disabled' });
  await list.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Nome da lista', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Nome da lista', { exact: true })).toHaveValue('Mercado da semana');

  await page.goto('/notas');
  await page.getByRole('button', { name: 'Nova nota', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toBeFocused();
  await page.getByLabel('Título', { exact: true }).fill('Ideias para a semana');
  await page.getByLabel('Texto', { exact: true }).fill('Revisar as anotações e separar o material de estudo.');
  await page.getByRole('button', { name: 'Salvar nota', exact: true }).click();
  await expect(page.getByText('Nota salva.', { exact: true })).toBeVisible();
  await page.reload();
  const note = page.locator('article.note').filter({ hasText: 'Ideias para a semana' });
  await expect(note).toBeVisible();
  expect((await note.boundingBox())!.y).toBeLessThan((await page.locator('.note-composer').boundingBox())!.y);
  await expect(page).toHaveScreenshot('notes-content-mobile.png', { animations: 'disabled' });
  await note.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Ideias para a semana');
});

test('detalhes inexistentes oferecem retorno e trocar de lista limpa o documento anterior', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await page.setViewportSize({ width: 320, height: 720 });
  for (const [route, title, back, destination] of [
    ['/notas/00000000-0000-4000-8000-000000000000', 'Nota indisponível', 'Voltar às notas', '/notas'],
    ['/atividade/00000000-0000-4000-8000-000000000000', 'Atividade indisponível', 'Voltar ao Meu dia', '/hoje'],
    ['/compras/00000000-0000-4000-8000-000000000000', 'Lista indisponível', 'Voltar às compras', '/compras'],
  ] as const) {
    await page.goto(route);
    await expect(page.locator('#page-title')).toHaveText(title);
    await expect(page.locator('#page-title')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('link', { name: back, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
  }
  await page.getByLabel('Nome da lista', { exact: true }).fill('Mercado da semana');
  await page.getByRole('button', { name: 'Criar lista', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Mercado da semana');
  await page.getByLabel('Adicionar item', { exact: true }).fill('Café');
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await expect(page.getByTestId('shopping-items-section').getByText('Café', { exact: true })).toBeVisible();
  const detail = page.url();
  // Same mounted route, through browser history: previous item state must not leak to the new ID.
  await page.evaluate(() => {
    history.pushState({}, '', '/compras/00000000-0000-4000-8000-000000000000');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('#page-title')).toHaveText('Lista indisponível');
  await expect(page.locator('#page-title')).toBeFocused();
  await expect(page.getByLabel('Adicionar item', { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(detail);
  await expect(page.locator('#page-title')).toHaveText('Mercado da semana');
  await expect(page.getByTestId('shopping-items-section').getByText('Café', { exact: true })).toBeVisible();
});
