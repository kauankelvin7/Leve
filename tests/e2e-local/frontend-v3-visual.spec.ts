import { expect, test, type Locator, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

async function capture(page: Page, name: string, fullPage = true) {
  mkdirSync('test-results/visual-walkthrough', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  if (new URL(page.url()).pathname === '/hoje') {
    // Gika opens independently of the live query. Capture the settled page
    // behind its modal rather than a transient agenda loading state.
    const summary = page.locator('section[aria-label="Resumo do dia selecionado"] h2');
    await expect(summary).toBeAttached();
    await expect(summary).not.toHaveText('Abrindo o dia…');
  }
  await expect(page).toHaveScreenshot(name, {
    fullPage,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
  });
  await page.screenshot({ path: `test-results/visual-walkthrough/${name}`, fullPage, animations: 'disabled', caret: 'hide' });
}

async function captureTodayAside(page: Page, name: string) {
  mkdirSync('test-results/visual-walkthrough', { recursive: true });
  const aside = page.locator('.agenda-aside');
  await expect(aside.locator('.month-panel-summary span')).not.toHaveText('Carregando compromissos…');
  await expect(aside).toHaveScreenshot(`today-aside-${name}.png`, { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 });
  await aside.screenshot({ path: `test-results/visual-walkthrough/today-aside-${name}.png`, animations: 'disabled', caret: 'hide' });
  const computedStyles = await page.evaluate(() => {
    const properties = ['display', 'grid-template-columns', 'align-content', 'gap', 'background-color', 'border-color', 'border-radius', 'padding', 'box-shadow', 'color', 'font-size', 'min-height', 'flex-direction', 'justify-content', 'translate'];
    const selectors = ['.agenda-aside', '.today-month-panel', '.month-picker', '.month-panel-summary', '.month-panel-actions', '.note', '.shopping-summary'];
    return Object.fromEntries(selectors.map(selector => {
      const element = document.querySelector(selector);
      if (!element) return [selector, null];
      const computed = getComputedStyle(element);
      return [selector, Object.fromEntries(properties.map(property => [property, computed.getPropertyValue(property)]))];
    }));
  });
  writeFileSync(`test-results/visual-walkthrough/today-aside-${name}-computed.json`, `${JSON.stringify(computedStyles, null, 2)}\n`);
}

async function captureElement(locator: Locator, name: string) {
  mkdirSync('test-results/visual-walkthrough', { recursive: true });
  await expect(locator).toHaveScreenshot(name, { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 });
  await locator.screenshot({ path: `test-results/visual-walkthrough/${name}`, animations: 'disabled', caret: 'hide' });
}

test('layouts canônicos do frontend em desktop, mobile e temas claro/escuro', async ({ page }) => {
  test.setTimeout(180_000);
  const resetSeed = spawnSync(process.execPath, ['scripts/seed-local.mjs'], {
    env: { ...process.env, LEVE_RESET_SEED: 'true' },
    encoding: 'utf8',
  });
  if (resetSeed.status !== 0) throw new Error(`Não foi possível resetar a conta visual local: ${resetSeed.stderr || resetSeed.error?.message || 'falha sem diagnóstico'}`);
  await page.clock.install({ time: new Date('2026-10-05T12:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  if (await skip.isVisible()) {
    const guideSaved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
    await skip.click();
    await guideSaved;
  }
  await page.goto('/configuracoes');
  const reduceTransparency = page.getByLabel('Reduzir transparência', { exact: true });
  if (await reduceTransparency.isChecked()) {
    await reduceTransparency.uncheck();
    await page.getByRole('button', { name: 'Salvar preferências' }).click();
    await expect(page.getByText('Preferências salvas.', { exact: true })).toBeVisible();
  }
  await page.locator('#settings-look').scrollIntoViewIfNeeded();
  const lightAppearance = page.getByRole('radio', { name: 'Claro', exact: true });
  if (!(await lightAppearance.isChecked())) {
    await lightAppearance.click();
    await expect(page.getByText('Aparência salva.', { exact: true })).toBeVisible();
  }
  const greenPalette = page.getByRole('radio', { name: 'Verde suave', exact: true });
  if (!(await greenPalette.isChecked())) {
    await greenPalette.click();
    await expect(page.getByText('Aparência salva.', { exact: true })).toBeVisible();
  }
  await page.goto('/hoje');
  await expect(page.locator('#page-title')).toHaveText('Meu dia');

  await capture(page, 'today-desktop-light.png');
  await captureTodayAside(page, 'desktop-light');
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova atividade', exact: true })).toBeVisible();
  const composer = page.locator('.activity-composer');
  await expect(composer).toHaveScreenshot('today-composer-panel.png', { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 });
  await composer.screenshot({ path: 'test-results/visual-walkthrough/today-composer-panel.png', animations: 'disabled', caret: 'hide' });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await page.goto('/calendario');
  await expect(page.locator('#page-title')).toHaveText('Calendário');
  await capture(page, 'calendar-desktop-light.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.removeItem('leve.calendar.view'));
  await page.goto('/calendario');
  await expect(page.getByRole('button', { name: 'Dia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Visão diária')).toBeVisible();
  await capture(page, 'calendar-mobile-light.png', false);

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/notas');
  await expect(page.locator('#page-title')).toHaveText('Notas');
  await capture(page, 'notes-desktop-light.png');
  await page.goto('/revisao');
  await expect(page.locator('#page-title')).toHaveText('Revisão');
  await expect(page.locator('main section[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  await capture(page, 'review-desktop-light.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'review-mobile-light.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/compras');
  await expect(page.locator('#page-title')).toHaveText('Compras');
  await capture(page, 'shopping-desktop-light.png');
  const listComposer = page.getByTestId('shopping-list-composer');
  await captureElement(listComposer, 'shopping-list-composer-create-desktop.png');
  await listComposer.locator('.optional-fields > summary').click();
  await captureElement(listComposer, 'shopping-list-composer-create-options-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await captureElement(listComposer, 'shopping-list-composer-create-options-mobile.png');
  await listComposer.locator('.optional-fields > summary').click();
  await page.setViewportSize({ width: 1366, height: 768 });
  const listTitle = 'Lista para validação visual';
  await page.getByRole('button', { name: 'Nova lista' }).click();
  await expect(page.getByLabel('Nome da lista', { exact: true })).toBeFocused();
  await page.getByLabel('Nome da lista', { exact: true }).fill(listTitle);
  await page.getByRole('button', { name: 'Criar lista' }).click();
  await expect(page.locator('#page-title')).toHaveText(listTitle);

  const itemComposer = page.locator('.shopping-composer');
  await expect(itemComposer).toBeVisible();
  await captureElement(itemComposer, 'shopping-item-composer-add-desktop.png');

  const shoppingItemsSection = page.getByTestId('shopping-items-section');
  await expect(shoppingItemsSection).toBeVisible();
  await captureElement(shoppingItemsSection, 'shopping-items-empty.png');

  await page.route('**/api/commands', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Serviço de compras temporariamente indisponível.' }),
  }));
  await page.getByLabel('Adicionar item', { exact: true }).fill('Item preservado após falha');
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  const shoppingFeedback = page.locator('.shopping-feedback');
  await expect(shoppingFeedback).toHaveText('Serviço de compras temporariamente indisponível.');
  await captureElement(shoppingFeedback, 'shopping-feedback-service-error.png');
  await page.unroute('**/api/commands');

  await page.evaluate(() => localStorage.setItem('leve.offlineEnabled', 'true'));
  await page.context().setOffline(true);
  await page.getByLabel('Adicionar item', { exact: true }).fill('Item preservado sem conexão');
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await expect(shoppingFeedback).toHaveText('Salvo neste aparelho e aguardando conexão.');
  await expect(page.getByLabel('Adicionar item', { exact: true })).toHaveValue('');
  await captureElement(shoppingFeedback, 'shopping-feedback-offline.png');
  const syncStatus = page.locator('.sync-status');
  await expect(syncStatus).toContainText('1 alteração salva neste aparelho.');
  await captureElement(syncStatus, 'shopping-offline-outbox.png');
  await page.context().setOffline(false);
  await expect(shoppingItemsSection.locator('.shopping-pending-items')).toContainText('Item preservado sem conexão');
  await expect(shoppingItemsSection.getByText('Item preservado sem conexão', { exact: true })).toHaveCount(1);

  await page.getByLabel('Adicionar item', { exact: true }).fill('Teste da rota de detalhes');
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await expect(page.getByText('Teste da rota de detalhes', { exact: true })).toBeVisible();
  await shoppingItemsSection.getByRole('button').filter({ hasText: 'Teste da rota de detalhes' }).click();
  await expect(page.getByRole('heading', { name: 'Editar item', exact: true })).toBeVisible();
  await page.getByLabel('Unidade', { exact: true }).selectOption('outra');
  await page.getByLabel('Qual unidade?', { exact: true }).fill('caixa');
  await captureElement(itemComposer, 'shopping-item-composer-edit-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await captureElement(itemComposer, 'shopping-item-composer-edit-mobile.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(shoppingItemsSection.locator('.shopping-pending-items')).toBeVisible();
  await captureElement(shoppingItemsSection, 'shopping-items-pending.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/visual-walkthrough/shopping-detail-live.png', animations: 'disabled', caret: 'hide' });

  await page.getByRole('checkbox', { name: 'Marcar Teste da rota de detalhes como concluído' }).click();
  const completedGroup = shoppingItemsSection.locator('.completed-shopping');
  await expect(completedGroup).toBeVisible({ timeout: 10_000 });
  await completedGroup.locator('summary').click();
  await expect(completedGroup.getByText('Teste da rota de detalhes', { exact: true })).toBeVisible();
  await captureElement(shoppingItemsSection, 'shopping-items-completed.png');

  await page.getByLabel('Adicionar item', { exact: true }).fill('Item para remover');
  await page.getByRole('button', { name: 'Adicionar item', exact: true }).click();
  await expect(page.getByText('Item para remover', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir Item para remover' }).click();
  const deletedItems = page.locator('.deleted-shopping-items');
  await expect(deletedItems).toBeVisible();
  await deletedItems.locator('summary').click();
  await expect(deletedItems.getByText('Item para remover', { exact: true })).toBeVisible();
  await captureElement(deletedItems, 'shopping-items-removed.png');
  const shoppingDetailUrl = page.url();
  await page.goto('/compras');
  const createdList = page.locator('.shopping-list-card').filter({ hasText: listTitle });
  await expect(createdList).toBeVisible();
  await createdList.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(listComposer.getByRole('heading', { name: 'Editar lista', exact: true })).toBeVisible();
  await expect(listComposer.locator('.optional-fields')).toHaveCount(0);
  await captureElement(listComposer, 'shopping-list-composer-edit-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await captureElement(listComposer, 'shopping-list-composer-edit-mobile.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(createdList).toBeVisible();
  const editedListTitle = 'Lista visual revisada';
  await createdList.getByRole('button', { name: 'Editar', exact: true }).click();
  await listComposer.getByLabel('Nome da lista', { exact: true }).fill(editedListTitle);
  await listComposer.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByText(editedListTitle, { exact: true })).toBeVisible();
  await expect(page.locator('.shopping-list-card')).toHaveCount(1);
  await page.goto(shoppingDetailUrl);
  await expect(page.locator('#page-title')).toHaveText(editedListTitle);

  await page.goto('/buscar');
  await expect(page.locator('#page-title')).toHaveText('Buscar');
  await page.getByRole('searchbox').fill(editedListTitle);
  const searchResults = page.locator('main ul');
  const searchResult = searchResults.getByRole('link');
  await expect(searchResult).toHaveCount(1);
  await expect(searchResult).toHaveCSS('display', 'grid');
  await expect(searchResult).toHaveCSS('min-height', '72px');
  await expect(searchResults).toHaveCSS('max-width', '760px');

  await page.goto('/lixeira');
  await expect(page.locator('#page-title')).toHaveText('Lixeira');
  await expect(page.locator('.trash-list')).toContainText('Item para remover');
  await capture(page, 'trash-desktop-light.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'trash-mobile-light.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/configuracoes');
  await expect(page.locator('#page-title')).toHaveText('Preferências');
  await capture(page, 'settings-desktop-light.png');

  await page.goto('/hoje');
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Gika' })).toBeVisible();
  await capture(page, 'gika-desktop-light.png', false);
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Gika' })).toBeVisible();
  await capture(page, 'gika-mobile-light.png', false);
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();

  await page.goto('/hoje');
  await captureTodayAside(page, 'mobile-light');

  await page.goto('/configuracoes');
  await page.locator('#settings-look').scrollIntoViewIfNeeded();
  const darkAppearance = page.getByRole('radio', { name: 'Escuro', exact: true });
  if (!(await darkAppearance.isChecked())) {
    await darkAppearance.click();
    await expect(page.getByText('Aparência salva.', { exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/configuracoes');
  await expect(page.locator('#page-title')).toHaveText('Preferências');
  await capture(page, 'settings-mobile-dark.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/revisao');
  await expect(page.locator('#page-title')).toHaveText('Revisão');
  await expect(page.locator('main section[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  await capture(page, 'review-desktop-dark.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'review-mobile-dark.png');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(shoppingDetailUrl);
  await expect(page.getByTestId('shopping-items-section')).toBeVisible();
  await captureElement(page.getByTestId('shopping-items-section'), 'shopping-items-desktop-dark.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(shoppingDetailUrl);
  await expect(page.getByTestId('shopping-items-section')).toBeVisible();
  await captureElement(page.getByTestId('shopping-items-section'), 'shopping-items-mobile-dark.png');

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/hoje');
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await captureTodayAside(page, 'desktop-dark');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hoje');
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await captureTodayAside(page, 'mobile-dark');
  await capture(page, 'today-mobile-dark.png', false);

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/demo/compras');
  await expect(page.locator('#page-title')).toHaveText('Compras');
  await expect(page.locator('.shopping-item')).toHaveCount(3);
  await capture(page, 'demo-shopping-desktop.png');

  await page.goto('/demo/hoje');
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const demoCard = page.locator('[data-demo-activity-card]').first();
  await expect(demoCard).toHaveCSS('display', 'flex');
  await expect(demoCard).toHaveCSS('min-height', '90px');
  await page.evaluate(() => document.documentElement.setAttribute('data-appearance', 'light'));
  const lightCardBackground = await demoCard.evaluate(element => `${getComputedStyle(element).backgroundColor}|${getComputedStyle(element).backgroundImage}`);
  await page.evaluate(() => document.documentElement.setAttribute('data-appearance', 'dark'));
  const darkCardBackground = await demoCard.evaluate(element => `${getComputedStyle(element).backgroundColor}|${getComputedStyle(element).backgroundImage}`);
  expect(darkCardBackground).not.toBe(lightCardBackground);
  await page.setViewportSize({ width: 390, height: 844 });
  const demoRowColumns = await page.locator('.activity-list article').first().evaluate(element => getComputedStyle(element).gridTemplateColumns);
  expect(demoRowColumns.startsWith('56px ')).toBe(true);
});
