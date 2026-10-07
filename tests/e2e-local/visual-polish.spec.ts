import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { isolatedTestAccount } from '../helpers/gikaBatch';
import { colorThemeIds } from '../../packages/domain/src/themes';

test.use({
  launchOptions: {
    ...(process.env.LEVE_CHROMIUM_EXECUTABLE ? { executablePath: process.env.LEVE_CHROMIUM_EXECUTABLE } : {}),
    args: ['--disable-lcd-text'],
  },
});

test('sidebar compacta mantém perfil acessível e footer organiza links e saída', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await appearance(page, 'Escuro');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/hoje');
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  const sidebar = page.locator('.sidebar');
  const bounds = (await sidebar.boundingBox())!;
  expect(bounds.width).toBeLessThanOrEqual(224);
  expect(bounds.height).toBeLessThan(600);
  await expect(sidebar).toHaveCSS('position', 'sticky');
  const nav = (await page.getByRole('navigation', { name: 'Principal', exact: true }).boundingBox())!;
  const search = (await sidebar.getByRole('link', { name: 'Buscar', exact: true }).boundingBox())!;
  expect(search.y - nav.y - nav.height).toBeLessThanOrEqual(24);
  const footer = page.locator('footer.page-footer');
  const identity = (await footer.getByText('Sua agenda privada', { exact: true }).boundingBox())!;
  const legal = (await footer.getByRole('navigation', { name: 'Informações legais', exact: true }).boundingBox())!;
  expect(identity.y).toBeGreaterThanOrEqual(legal.y);
  expect(identity.y + identity.height).toBeLessThanOrEqual(legal.y + legal.height);
  expect(await footer.locator('a, button').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height >= 44))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('shell-footer-purple-dark-desktop.png', { fullPage: true, animations: 'disabled' });
  // A short desktop scrolls the navigation itself; the profile remains reachable.
  await page.setViewportSize({ width: 1366, height: 420 });
  expect(await sidebar.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const profile = sidebar.getByRole('link', { name: 'Perfil e preferências', exact: true });
  await profile.focus();
  await expect(profile).toBeInViewport();
  expect(await profile.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hoje');
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await footer.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page).toHaveScreenshot('shell-footer-purple-dark-mobile.png', { animations: 'disabled' });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; window.scrollTo(0, document.documentElement.scrollHeight); });
  await noOverflow(page);
  const week = page.locator('.day-picker:not(.month-picker)');
  expect(await week.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await week.locator('strong').evaluateAll(elements => elements.every(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    return range.getClientRects().length === 1 && range.getBoundingClientRect().width <= element.parentElement!.getBoundingClientRect().width;
  }))).toBe(true);
  const logout = footer.getByRole('button', { name: 'Sair', exact: true });
  const exit = (await logout.boundingBox())!;
  expect(exit.y + exit.height).toBeLessThan((await sidebar.boundingBox())!.y);
  await footer.getByRole('link', { name: 'Privacidade', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Privacidade no Leve');
  await page.goto('/hoje');
  await page.locator('footer.page-footer').getByRole('link', { name: 'Termos', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Termos de uso do Leve');
  await page.goto('/hoje');
  await logout.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
});

const title = 'Revisar o planejamento';

async function login(page: Page) {
  const email = await isolatedTestAccount('visual-polish');
  await page.clock.install({ time: new Date('2026-10-06T13:00:00Z') });
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
  await page.evaluate(async taskTitle => {
    const path = '/src/platform/api.ts';
    const { sendCommand } = await import(/* @vite-ignore */ path);
    await sendCommand({ command: 'activity.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload: {
      title: taskTitle, descriptionPlain: '', categoryId: null, colorHex: null, estimatedMinutes: null, reminderSpecs: [],
      schedule: { type: 'task', dueDate: '2026-10-06', dueTime: '12:30', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' },
    } });
  }, title);
}

async function appearance(page: Page, mode: 'Claro' | 'Escuro') {
  await page.goto('/configuracoes');
  for (const name of ['Roxo suave', mode]) {
    const radio = page.getByRole('radio', { name, exact: true });
    if (!(await radio.isChecked())) {
      const saved = page.waitForResponse(response => response.url().endsWith('/api/session') && response.ok());
      await radio.click();
      await saved;
    }
  }
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Meu dia prioriza tarefas, calendário e filtros recolhem sem perder navegação', async ({ page }) => {
  test.setTimeout(150_000);
  await login(page);
  for (const mode of ['Claro', 'Escuro'] as const) {
    await appearance(page, mode);
    for (const [width, height] of [[320, 720], [390, 844], [1024, 768], [1366, 900]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/hoje');
      const task = page.locator('.activity-manage').filter({ hasText: title });
      await expect(task).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const box = (await task.boundingBox())!;
      const brief = page.getByRole('region', { name: 'Resumo em áudio', exact: true });
      expect(box.y).toBeLessThan((await brief.boundingBox())!.y);
      const navigation = await page.locator('.sidebar').boundingBox();
      const usableBottom = width < 740 ? navigation!.y : height;
      // At 320 px the complete card can require scrolling; its title is still visible.
      const taskTitle = (await task.getByRole('link', { name: title, exact: true }).boundingBox())!;
      expect(taskTitle.y + taskTitle.height).toBeLessThan(usableBottom);
      if (width >= 390) expect(box.y + box.height).toBeLessThan(usableBottom);
      expect(await task.locator('.row-actions :is(button,.button)').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height >= 44))).toBe(true);
      const month = page.locator('.today-month-panel');
      await expect(month).toHaveJSProperty('open', width >= 1120);
      if (width >= 1120) expect((await month.boundingBox())!.x).toBeGreaterThan(box.x + box.width);
      await noOverflow(page);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
      if (mode === 'Escuro' && [390, 1366].includes(width)) {
        await expect(page).toHaveScreenshot(`today-purple-dark-${width}.png`, { animations: 'disabled' });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hoje');
  const filters = page.locator('details').filter({ has: page.getByText('Filtrar atividades', { exact: true }) });
  await expect(filters).toHaveJSProperty('open', false);
  await filters.locator('summary').click();
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('completed');
  await expect(page.getByText('Nenhuma tarefa com estes filtros.', { exact: true })).toBeVisible();
  await filters.locator('summary').click();
  await expect(filters.locator('summary')).toContainText('1 filtro ativo');
  await filters.locator('summary').click();
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('all');
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  const brief = page.getByRole('region', { name: 'Resumo em áudio', exact: true });
  await brief.locator('summary').click();
  await expect(brief.locator('details > p')).toContainText(title);
  const month = page.locator('.today-month-panel');
  await month.locator('summary').click();
  await month.getByRole('button', { name: /quarta-feira, 7 de outubro de 2026/ }).click();
  await expect(page.getByRole('region', { name: 'Resumo do dia selecionado', exact: true })).toContainText('quarta-feira');
  await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  await month.getByRole('button', { name: 'Hoje', exact: true }).click();
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova atividade', exact: true })).toBeVisible();
  await page.getByLabel('Título', { exact: true }).fill('Rascunho preservado');
  await page.locator('.gika-launcher').click();
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Rascunho preservado');
});

test('navegação alinha texto e Gika mantém acolhimento, envio, erro e reflow acessíveis', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await appearance(page, 'Escuro');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/hoje');
  await expect(page.locator('.sidebar > nav > :is(a,button) .nav-label')).toHaveCount(5);
  const labels = await page.locator('.sidebar > nav > :is(a,button) .nav-label').evaluateAll(elements => elements.map(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    return range.getBoundingClientRect().left;
  }));
  expect(labels).toHaveLength(5);
  expect(Math.max(...labels) - Math.min(...labels)).toBeLessThanOrEqual(1);
  await page.locator('.gika-launcher').click();
  const dialog = page.getByRole('dialog', { name: 'Gika', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('aria-describedby', /.+/);
  await expect(dialog.locator('.gika-character')).toHaveCount(1);
  const send = page.getByRole('button', { name: 'Enviar pergunta', exact: true });
  await expect(send).toBeDisabled();
  const disabledBackground = await send.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'O que tenho hoje?', exact: true }).click();
  await expect(send).toBeEnabled();
  expect(await send.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(disabledBackground);
  await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot('gika-purple-dark-mobile.png', { animations: 'disabled' });
  await page.route('**/api/gika/respond', route => route.fulfill({ status: 503, json: { code: 'GIKA_UNAVAILABLE', message: 'Indisponível no teste.' } }));
  await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill('O que tenho hoje?');
  await send.click();
  await expect(dialog.getByText('Resposta indisponível', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.context().setOffline(true);
  await expect(dialog.getByText('Sem conexão', { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  await page.context().setOffline(false);
  await expect(send).toBeEnabled();
  await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  // A fresh conversation at 200% must not crop the beginning of the welcome.
  await page.reload();
  await page.setViewportSize({ width: 320, height: 720 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.locator('.gika-launcher').click();
  const content = dialog.locator('.gika-content');
  expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await content.evaluate(element => {
    const welcome = element.querySelector('.gika-welcome')!;
    return welcome.getBoundingClientRect().top >= element.getBoundingClientRect().top;
  })).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toBeInViewport();
  await dialog.getByRole('button', { name: 'Adicionar uma tarefa', exact: true }).click();
  await expect(send).toBeEnabled();
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(send).toHaveCSS('border-top-style', 'solid');
  await noOverflow(page);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});

test('superfícies e leitura preservam as onze paletas claras e escuras', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/hoje');
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  for (const palette of colorThemeIds) for (const mode of ['light', 'dark'] as const) {
    // Exercise the production theme runtime; this matrix does not assert profile persistence.
    await page.evaluate(async ({ palette, mode }) => {
      const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path);
      theme.applyColorTheme(palette); theme.applyAppearance(mode);
    }, { palette, mode });
    await expect(page.locator('html')).toHaveAttribute('data-theme', palette);
    await expect(page.locator('html')).toHaveAttribute('data-appearance', mode);
    await noOverflow(page);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(audit.violations, `${palette}/${mode}`).toEqual([]);
    await page.locator('.gika-launcher').click();
    await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations, `Gika ${palette}/${mode}`).toEqual([]);
    await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
  }
  await page.goto('/configuracoes');
  await page.getByLabel('Reduzir transparência', { exact: true }).check();
  await page.getByLabel('Aumentar contraste', { exact: true }).check();
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
  await expect(page.getByText('Preferências salvas.', { exact: true })).toBeVisible();
  await page.goto('/hoje');
  await expect(page.locator('.app-shell')).toHaveClass(/high-contrast/);
  await expect(page.locator('.app-shell')).toHaveClass(/solid/);
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.locator('.gika-launcher').focus();
  await expect(page.locator('.gika-launcher')).toHaveCSS('outline-width', '3px');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await appearance(page, 'Escuro');
  await page.goto('/hoje');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await expect(page.locator('.app-shell')).toHaveClass(/high-contrast/);
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.locator('.gika-launcher').click();
  await expect(page.getByRole('dialog', { name: 'Gika', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});

test('atividades do calendário usam diálogo modal no celular e retornam o foco ao dia', async ({ page }) => {
  await login(page);
  await appearance(page, 'Escuro');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'Mês', exact: true }).click();
  await expect(page.locator('.calendar-panel')).toHaveAttribute('aria-busy', 'false');
  const day = page.locator('.calendar-day[aria-pressed="true"]');
  await day.click();
  const dialog = page.getByRole('dialog', { name: '6 de outubro', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  await expect(dialog.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.locator('.gika-launcher').focus();
  await expect(page.locator('.gika-launcher')).not.toBeFocused();
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !document.activeElement?.closest('.sidebar, .workspace-bar, footer'))).toBe(true);
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await expect(page).toHaveScreenshot('calendar-day-dialog-purple-dark-mobile.png', { animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(day).toBeFocused();
  await day.click();
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await expect(day).toBeFocused();
  await day.click();
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator('dialog.calendar-agenda')).toHaveCount(0);
  await expect(page.locator('section.calendar-agenda')).toBeVisible();
  await expect(page.locator('section.calendar-agenda').getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  await day.click();
  await dialog.getByRole('link', { name: 'Adicionar neste dia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nova atividade', exact: true })).toBeVisible();
  await expect(page.getByLabel('Data', { exact: true })).toHaveValue('2026-10-06');
});
