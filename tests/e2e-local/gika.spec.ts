import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enterLocalAgenda(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
}

test('painel acessível abre e fecha sem perder rascunho nem navegação', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('button', { name: 'Pergunte à Gika' })).toHaveCount(0);
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Rascunho preservado');
  const url = page.url();
  const launcher = page.getByRole('button', { name: 'Pergunte à Gika' });
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Gika', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('as respostas são simuladas');
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Fechar Gika' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Fechar Gika' })).toBeFocused();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(launcher).toBeFocused();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Rascunho preservado');
  await page.getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Calendário');
  await launcher.click();
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await expect(dialog).not.toBeVisible();
});

test('composer preserva texto, permite sugestões e bloqueia envio offline', async ({ page, context }) => {
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await page.getByRole('button', { name: 'Organizar meu dia', exact: true }).click();
  await expect(question).toHaveValue('Organizar meu dia');
  await expect(question).toBeFocused();
  await question.fill('Meu rascunho');
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(question).toHaveValue('Meu rascunho');
  await question.press('Shift+Enter');
  await expect(question).toHaveValue('Meu rascunho\n');
  await context.setOffline(true);
  await expect(page.getByText('A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
  await question.press('Enter');
  await expect(page.locator('.gika-message')).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Enviar pergunta' })).toBeEnabled();
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Notas', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Notas');
});

test('falha mantém pergunta e retry não duplica a mensagem', async ({ page }) => {
  // Test-only module fixture. No failure switch is exposed in the product UI.
  await page.route('**/features/gika/mockAdapter.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    let calls = 0;
    export const mockAdapter = async () => {
      if (++calls === 1) throw new Error('Test failure');
      return { text: 'Demonstração: resposta recuperada. Nenhuma alteração foi feita.', simulated: true };
    };
  ` }));
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Academia amanhã');
  await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(question).toHaveValue('Academia amanhã');
  await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await expect(page.locator('.gika-message.is-assistant')).toContainText('resposta recuperada');
  await expect(question).toHaveValue('');
});

test('mock responde sem consulta, comandos ou duplicação por envio repetido', async ({ page }) => {
  await enterLocalAgenda(page);
  const mutations: string[] = []; const pageErrors: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/commands')) mutations.push(request.url()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('O que tenho amanhã?');
  await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
  await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant')).toContainText('Nenhuma tarefa foi consultada ou criada');
  await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await expect(question).toHaveValue('');
  await question.fill('<img src=x onerror="alert(1)">');
  await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(2);
  await expect(page.locator('.gika-messages img')).toHaveCount(0);
  expect(mutations).toEqual([]); expect(pageErrors).toEqual([]);
});

test('fechar cancela resposta pendente sem perder pergunta e sair limpa conversa', async ({ page }) => {
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Meu texto privado');
  await question.press('Enter');
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(question).toHaveValue('Meu texto privado');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(question).toHaveValue('');
  await expect(page.locator('.gika-message')).toHaveCount(0);
});

test('IME não envia composição e uma saída inválida vira erro sem alegar sucesso', async ({ page }) => {
  await page.route('**/features/gika/mockAdapter.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export const mockAdapter = async () => ({ text: 'Tarefa criada.', simulated: false, command: 'activity.create' });` }));
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Texto em composição');
  await question.dispatchEvent('compositionstart');
  await question.press('Enter');
  await expect(page.locator('.gika-message')).toHaveCount(0);
  await question.dispatchEvent('compositionend');
  await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  await expect(question).toHaveValue(/Texto em composição/);
});

test('paletas, viewports, contraste, movimento reduzido e reflow mantêm o painel utilizável', async ({ page }) => {
  test.setTimeout(120_000);
  await enterLocalAgenda(page);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const dialog = page.getByRole('dialog', { name: 'Gika', exact: true });
  // Exercise real theme resolver without updating the fake user's remote preferences for every case.
  await expect(dialog).toBeVisible();
  const palettes = ['green', 'purple', 'blue', 'red', 'orange', 'pink', 'teal', 'indigo', 'amber', 'brown', 'monochrome'];
  for (const appearance of ['light', 'dark', 'system']) {
    for (const theme of palettes) {
      await page.evaluate(async ({ theme, appearance }) => {
        const modulePath = '/src/platform/theme.ts';
        const module = await import(/* @vite-ignore */ modulePath);
        module.applyColorTheme(theme); module.applyAppearance(appearance);
      }, { theme, appearance });
      expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations, `${theme}/${appearance}`).toEqual([]);
    }
  }
  for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [430, 932], [390, 844], [360, 800], [360, 400]]) {
    await page.setViewportSize({ width: width!, height: height! });
    await expect.poll(async () => { const bounds = await dialog.boundingBox(); return bounds!.y + bounds!.height; }).toBeLessThanOrEqual(height! + 1);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width! + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height! + 1);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Enviar pergunta' })).toBeVisible();
    const firstAction = await page.getByRole('button', { name: 'Organizar meu dia', exact: true }).boundingBox();
    const conversationArea = await page.locator('.gika-content').boundingBox();
    expect(firstAction!.y + Math.min(24, firstAction!.height)).toBeLessThanOrEqual(conversationArea!.y + conversationArea!.height);
    expect((await page.locator('.gika-composer-field').boundingBox())!.height).toBeLessThanOrEqual(70);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('.app-shell').evaluate(el => el.classList.add('solid', 'reduce-motion', 'high-contrast'));
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Fechar Gika' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika' })).toBeVisible();
  expect((await page.locator('.gika-content').boundingBox())!.height).toBeGreaterThan(100);
  const firstActionAtZoom = await page.getByRole('button', { name: 'Organizar meu dia', exact: true }).boundingBox();
  const viewportAtZoom = await page.locator('.gika-content').boundingBox();
  expect(firstActionAtZoom!.y + 24).toBeLessThanOrEqual(viewportAtZoom!.y + viewportAtZoom!.height);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'docs/gika/evidence/m1-mobile-reflow.png' });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.locator('.app-shell').evaluate(el => el.classList.remove('solid', 'reduce-motion', 'high-contrast'));
  await page.screenshot({ path: 'docs/gika/evidence/m1-mobile-dark.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/gika/evidence/m1-desktop-dark.png' });
  await page.evaluate(async () => { const modulePath = '/src/platform/theme.ts'; const module = await import(/* @vite-ignore */ modulePath); module.applyAppearance('light'); });
  await page.screenshot({ path: 'docs/gika/evidence/m1-desktop-light.png' });
});

test('painel cabe em mobile e botão não cobre navegação', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await enterLocalAgenda(page);
  const launcher = page.getByRole('button', { name: 'Pergunte à Gika' });
  const button = await launcher.boundingBox();
  const nav = await page.locator('.sidebar').boundingBox();
  expect(button).not.toBeNull(); expect(nav).not.toBeNull();
  expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Gika', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await expect(launcher).toBeFocused();
});

test('conversa da conta anterior não aparece em uma segunda conta', async ({ page }) => {
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill('Texto privado da primeira conta');
  await page.getByRole('button', { name: 'Enviar pergunta' }).click();
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.goto('/registrar');
  await page.getByLabel('Seu nome').fill('Conta Gika fictícia');
  await page.getByLabel('E-mail').fill(`gika.${Date.now()}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('gika-local-123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('gika-local-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar neste ambiente' }).click();
  await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toHaveValue('');
  await expect(page.locator('.gika-message')).toHaveCount(0);
  await expect(page.getByText('Texto privado da primeira conta', { exact: true })).toHaveCount(0);
});

test('falha de carregamento da Gika não desmonta a agenda', async ({ page }) => {
  await page.route('**/features/gika/GikaPanel.tsx*', route => route.abort('failed'));
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect(page.getByRole('alert')).toContainText('Sua agenda continua disponível.');
  await page.getByRole('button', { name: 'Fechar e tentar novamente' }).click();
  await expect(page.getByRole('button', { name: 'Fechar e tentar novamente' })).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Calendário');
});

test('botão respeita cronômetro real em desktop e mobile', async ({ page }) => {
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  const title = `Timer Gika ${Date.now()}`;
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.locator('.activity-composer').getByRole('button', { name: 'Adicionar atividade', exact: true }).click();
  await page.getByRole('link', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar cronômetro', exact: true }).click();
  const timer = page.locator('.active-timer-bar');
  await expect(timer).toBeVisible();
  const launcher = page.getByRole('button', { name: 'Pergunte à Gika' });
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => {
      const button = await launcher.boundingBox(); const bar = await timer.boundingBox();
      return button!.y + button!.height <= bar!.y;
    }).toBe(true);
  }
  await page.screenshot({ path: 'docs/gika/evidence/m1-timer-mobile.png' });
  await timer.getByRole('button', { name: 'Encerrar cronômetro', exact: true }).click();
  await expect(timer).not.toBeVisible();
});

test('rascunho editado durante resposta é mantido e offline cancela a resposta', async ({ page, context }) => {
  await page.route('**/features/gika/mockAdapter.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const mockAdapter = async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return { text: 'Demonstração: resposta atrasada sem alterações.', simulated: true };
    };
  ` }));
  await enterLocalAgenda(page);
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Primeira pergunta'); await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled();
  await question.fill('Próxima pergunta');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  await expect(question).toHaveValue('Próxima pergunta');
  await question.press('Enter'); await context.setOffline(true);
  await expect(page.getByText('A Gika precisa de conexão para responder. Sua agenda continua funcionando normalmente.')).toBeVisible();
  // This adapter deliberately ignores AbortSignal; stale output must still be discarded by the hook.
  await page.waitForTimeout(1400);
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(1);
  await expect(question).toHaveValue('Próxima pergunta');
  await context.setOffline(false); await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(2);
  await expect(page.locator('.gika-message.is-user')).toHaveCount(2);
});


test('conversa tem scroll independente, composer expansível e cards apenas simulados', async ({ page }) => {
  await enterLocalAgenda(page);
  const mutations: string[] = []; const modelRequests: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/api/commands')) mutations.push(request.url());
    if (/generativelanguage|\/api\/gika/.test(request.url())) modelRequests.push(request.url());
  });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const viewport = page.getByRole('region', { name: 'Conversa com Gika', exact: true });
  const composer = page.locator('.gika-composer');
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await expect(page.getByRole('button', { name: 'Voz em breve' })).toBeDisabled();
  await expect(page.locator('.gika-suggestions button svg')).toHaveCount(4);
  await expect(page.locator('.gika-identity .gika-mark')).toHaveCount(1);
  const initialHeight = (await question.boundingBox())!.height;
  await question.fill('Linha um\nLinha dois\nLinha três');
  await expect.poll(async () => (await question.boundingBox())!.height).toBeGreaterThan(initialHeight);
  const expandedHeight = (await question.boundingBox())!.height;
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await expect.poll(async () => (await question.boundingBox())!.height).toBeGreaterThanOrEqual(expandedHeight);
  await question.fill('Organizar meu dia'); await question.press('Enter');
  await expect(page.getByRole('region', { name: 'Resultado de exemplo' })).toContainText('não vêm da sua agenda');
  await expect(page.getByRole('region', { name: 'Prévia de demonstração' })).toBeVisible();
  await page.getByRole('button', { name: 'Simular organização' }).click();
  await expect(page.getByRole('button', { name: 'Desfazer demonstração' })).toBeFocused();
  await page.getByRole('button', { name: 'Desfazer demonstração' }).click();
  await expect(page.getByText('Demonstração desfeita. Sua agenda não mudou.')).toBeVisible();
  await page.getByRole('button', { name: 'Ver prévia novamente' }).click();
  await expect(page.getByRole('button', { name: 'Simular organização' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancelar demonstração' }).click();
  await expect(page.getByText('Demonstração cancelada. Sua agenda não mudou.')).toBeVisible();
  for (let index = 0; index < 2; index++) {
    await question.fill(`Pergunta de demonstração ${index}: ${'Um texto mais longo para conferir a leitura da conversa. '.repeat(8)}`);
    await question.press('Enter');
    await expect(page.locator('.gika-message.is-assistant')).toHaveCount(index + 2);
  }
  for (const [width, height] of [[1440, 900], [360, 800], [360, 400]]) {
    await page.setViewportSize({ width: width!, height: height! });
    // Let VisualViewport/textarea resize observers settle before comparing footer geometry.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(async () => (await composer.boundingBox())!.y + (await composer.boundingBox())!.height).toBeLessThanOrEqual(height!);
    const before = await composer.boundingBox();
    await viewport.evaluate(el => { el.scrollTop = 0; });
    await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toBeVisible();
    const after = await composer.boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(await viewport.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await page.locator('#gika-dialog').evaluate(el => el.scrollHeight === el.clientHeight)).toBe(true);
    expect((await viewport.boundingBox())!.height).toBeGreaterThan(100);
    expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ver prévia novamente' }).click();
  await page.screenshot({ path: 'docs/gika/evidence/m1-conversation-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'docs/gika/evidence/m1-conversation-desktop.png' });
  expect(mutations).toEqual([]); expect(modelRequests).toEqual([]);
});


test('launcher no calendário fica fora do grid e da navegação desktop', async ({ page }) => {
  await enterLocalAgenda(page);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Calendário', exact: true }).click();
  const launcher = page.getByRole('button', { name: 'Pergunte à Gika' });
  for (const width of [1440, 1366, 1024]) {
    await page.setViewportSize({ width, height: 768 });
    await expect.poll(async () => {
      const entry = (await launcher.boundingBox())!;
      const sidebar = (await page.locator('.sidebar').boundingBox())!;
      const grid = (await page.locator('.calendar-time-view, .calendar-grid').first().boundingBox())!;
      return entry.y >= sidebar.y + sidebar.height && entry.x + entry.width < grid.x;
    }).toBe(true);
  }
});
