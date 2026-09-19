import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('cadastro, verificação, ativação, recuperação, saída e nova entrada funcionam pela interface', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto('/registrar');
  await expect(page.getByRole('heading', { name: 'Crie seu acesso' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Criar conta com Google' })).toBeVisible();
  await expect(page.getByText(/ainda não foi configurada neste ambiente/)).toHaveCount(0);
  await page.getByLabel('Seu nome').fill('Cadastro local');
  await page.getByLabel('E-mail').fill('cadastro.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('cadastro-local-123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('senhas-diferentes');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('alert')).toContainText('As senhas não coincidem.');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('cadastro-local-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText(/O ambiente local não envia e-mails reais/)).toContainText('cadastro.local@example.test');
  await expect(page.getByText(/Serviço indisponível/)).toHaveCount(0);
  await expect(page.getByText(/Não foi possível concluir o acesso/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Confirmar neste ambiente' }).click();
  await expect(page.getByRole('heading', { name: 'Finalize sua agenda' })).toBeVisible();
  await expect(page.getByLabel('Seu nome')).toHaveValue('Cadastro local');
  await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.getByRole('button', { name: 'Pular tutorial' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar acesso' })).toBeVisible();
  await page.getByLabel('E-mail').fill('cadastro.local@example.test');
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByText(/você receberá as instruções/)).toBeVisible();
  const resetCodesResponse = await fetch('http://localhost:9099/emulator/v1/projects/demo-leve/oobCodes');
  const resetCodes = await resetCodesResponse.json() as { oobCodes: Array<{ email: string; requestType: string }> };
  expect(resetCodes.oobCodes.some(code => code.email === 'cadastro.local@example.test' && code.requestType === 'PASSWORD_RESET')).toBe(true);
  await page.getByRole('link', { name: 'Voltar para entrar' }).click();
  await page.getByLabel('E-mail').fill('cadastro.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('cadastro-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Meu dia' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('login, ativação e atividade sobrevivem ao reload', async ({ page }) => {
  const pageErrors: string[] = [];
  const suffix = Date.now();
  const activityTitle = `Atividade persistente ${suffix}`;
  const noteTitle = `Nota persistente ${suffix}`;
  const noteText = `Conteúdo salvo com segurança ${suffix}.`;
  const listTitle = `Mercado ${suffix}`;
  const categoryName = `Trabalho ${suffix}`;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entre na sua agenda' })).toBeVisible();
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta local');
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByText('Sua semana')).toBeVisible();
  await expect(page.getByLabel('Fuso horário')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova atividade' }).click();
  await page.getByLabel('Título').fill(activityTitle);
  await page.getByLabel('Data').fill(today);
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  const checkbox = page.getByRole('listitem').filter({ hasText: activityTitle }).getByRole('checkbox');
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  await page.getByRole('navigation').getByRole('link', { name: 'Calendário' }).click();
  await expect(page.locator('.calendar-agenda').getByText(activityTitle, { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Notas' }).click();
  await page.getByLabel('Título').fill(noteTitle);
  await page.getByLabel('Texto').fill(noteText);
  await page.locator('.note-composer .optional-fields > summary').click();
  await page.getByLabel('Fixar no Meu dia').check();
  await page.getByRole('button', { name: 'Salvar nota' }).click();
  await expect(page.getByText(noteText)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: noteTitle })).toBeVisible();
  const note = page.locator('article').filter({ hasText: noteTitle });
  await note.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Texto').fill(`${noteText} Editado.`);
  await page.getByRole('button', { name: 'Concluir edição' }).click();
  await expect(page.getByText(`${noteText} Editado.`)).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Compras' }).click();
  await page.getByLabel('Nome da lista').fill(listTitle);
  await page.getByRole('button', { name: 'Criar lista' }).click();
  await expect(page.getByRole('heading', { name: listTitle, exact: true })).toBeVisible();
  await page.getByLabel('Adicionar item', { exact: true }).fill('Arroz');
  await page.getByRole('button', { name: 'Adicionar item' }).click();
  await expect(page.getByText('Arroz', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Arroz' }).click();
  await page.getByText('Concluídos (1)', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Marcar Arroz como pendente' })).toBeChecked();
  await page.reload();
  await page.getByText('Concluídos (1)', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Marcar Arroz como pendente' })).toBeChecked();
  const shoppingListUrl = page.url();
  await page.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Lixeira' }).click();
  await expect(page.getByText('Arroz', { exact: true })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Arroz' }).getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.getByText('Arroz', { exact: true })).toHaveCount(0);
  await page.goto(shoppingListUrl);
  await page.getByText('Concluídos (1)', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Marcar Arroz como pendente' })).toBeVisible();

  await page.getByRole('link', { name: /Preferências/ }).click();
  await page.getByLabel('Nome', { exact: true }).first().fill('Conta local atualizada');
  await page.getByLabel('Reduzir transparência').check();
  await page.getByRole('button', { name: 'Salvar preferências' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/solid/);
  await page.getByLabel('Nome', { exact: true }).last().fill(categoryName);
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Meu dia' }).click();
  await expect(page.getByText(noteTitle, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova atividade' }).click();
  await page.getByLabel('Tipo').selectOption('event');
  await page.getByLabel('Título').fill(`Compromisso persistente ${suffix}`);
  await page.getByLabel('Início').fill(today);
  await page.getByLabel('Horário inicial', { exact: true }).fill('10:00');
  await page.locator('.activity-composer .optional-fields > summary').click();
  await page.locator('select[name="categoryId"]').selectOption({ label: categoryName });
  await page.getByLabel('Fim').fill(today);
  await page.getByLabel('Horário final').fill('11:00');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(page.getByText(`Compromisso persistente ${suffix}`, { exact: true })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: activityTitle }).getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByText(activityTitle, { exact: true })).toHaveCount(0);
  await page.goto('/lixeira');
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: activityTitle }).getByRole('button', { name: 'Restaurar' }).click();
  await page.goto('/hoje');
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  expect(await page.locator('.vite-error-overlay').count()).toBe(0);
  expect(pageErrors).toEqual([]);
  await page.screenshot({ path: 'docs/evidence/e03-e05-conteudo-persistente.png', fullPage: true });
});

test('lixeira global restaura item de compras', async ({ page }) => {
  const suffix = Date.now();
  const listTitle = `Lixeira global ${suffix}`;
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta local');
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await page.goto('/compras');
  await page.getByLabel('Nome da lista').fill(listTitle);
  await page.getByRole('button', { name: 'Criar lista' }).click();
  await expect(page.getByRole('heading', { name: listTitle, exact: true })).toBeVisible();
  await page.getByLabel('Adicionar item', { exact: true }).fill('Item para restaurar');
  await page.getByRole('button', { name: 'Adicionar item' }).click();
  await expect(page.getByText('Item para restaurar', { exact: true })).toBeVisible();
  const shoppingListUrl = page.url();
  await page.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Lixeira' }).click();
  await expect(page.getByText('Item para restaurar', { exact: true })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Item para restaurar' }).getByRole('button', { name: 'Restaurar Item para restaurar', exact: true }).click();
  await expect(page.getByText('Item para restaurar', { exact: true })).toHaveCount(0);
  await page.goto(shoppingListUrl);
  await expect(page.getByText('Item para restaurar', { exact: true })).toBeVisible();
});

test('duas abas sincronizam, preservam alteração offline e encerram a mesma sessão', async ({ context, page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now();
  const onlineTitle = `Sincronizada entre abas ${suffix}`;
  const offlineTitle = `Criada sem rede ${suffix}`;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await expect(page).toHaveURL(/\/hoje$/);

  const secondPage = await context.newPage();
  await secondPage.goto('/hoje');
  await expect(secondPage.getByRole('heading', { name: 'Meu dia' })).toBeVisible();

  await page.getByRole('button', { name: 'Nova atividade' }).click();
  await page.getByLabel('Título').fill(onlineTitle);
  await page.getByLabel('Data').fill(today);
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(secondPage.getByText(onlineTitle, { exact: true })).toBeVisible();

  await page.evaluate(() => localStorage.setItem('leve.offlineEnabled', 'true'));
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Nova atividade' }).click();
  await page.getByLabel('Título').fill(offlineTitle);
  await page.getByLabel('Data').fill(today);
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(page.getByText(/Salvo neste aparelho e aguardando conexão/)).toBeVisible();
  await expect(secondPage.getByText(/1 alteração salva neste aparelho/)).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(offlineTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(secondPage.getByText(offlineTitle, { exact: true })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(secondPage).toHaveURL(/\/entrar$/, { timeout: 10_000 });
});

test('conflito de nota entre abas preserva as duas versões', async ({ context, page }) => {
  const suffix = Date.now();
  const title = `Conflito entre abas ${suffix}`;
  const remoteText = `Versão confirmada ${suffix}.`;
  const localText = `Rascunho concorrente ${suffix}.`;

  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Notas' }).click();
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Texto').fill('Texto inicial.');
  await page.getByRole('button', { name: 'Salvar nota' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  const secondPage = await context.newPage();
  await secondPage.goto('/notas');
  await expect(secondPage.getByRole('heading', { name: title })).toBeVisible();
  await page.locator('article').filter({ hasText: title }).getByRole('button', { name: 'Editar' }).click();
  await secondPage.locator('article').filter({ hasText: title }).getByRole('button', { name: 'Editar' }).click();

  await page.getByLabel('Texto').fill(remoteText);
  await page.getByRole('button', { name: 'Concluir edição' }).click();
  await expect(page.getByText(remoteText)).toBeVisible();

  await secondPage.getByLabel('Texto').fill(localText);
  await secondPage.getByRole('button', { name: 'Concluir edição' }).click();
  await expect(secondPage.getByRole('alert')).toContainText('Esta nota mudou em outra sessão');
  await secondPage.getByRole('button', { name: 'Salvar meu rascunho como cópia' }).click();
  await expect(secondPage.getByText(remoteText)).toBeVisible();
  await expect(secondPage.getByText(localText)).toBeVisible();
});

test('teclado e reflow equivalente a zoom de 200% mantêm todas as rotas acessíveis', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }

  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo' });
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
  await skipLink.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Buscar', exact: true }).last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Perfil e preferências' })).toBeVisible();

  for (const route of ['/hoje', '/notas', '/compras', '/configuracoes']) {
    await page.goto(route);
    await expect(page.locator('#page-title')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  }
});

test('exportação pessoal volta pela importação sem substituir os dados atuais', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Finalize sua agenda|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) {
    await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  }
  await page.goto('/configuracoes');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar uma cópia' }).click();
  const download = await downloadPromise;
  const archivePath = await download.path();
  expect(archivePath).not.toBeNull();
  const archive = JSON.parse(await readFile(archivePath!, 'utf8')) as { format: string; data: { categories: unknown[] } };
  expect(archive.format).toBe('leve-account-export');
  expect(archive.data.categories.length).toBeGreaterThan(0);
  await expect(page.getByText(/Exportação concluída/)).toBeVisible();

  await page.getByLabel('Arquivo para importar').setInputFiles(archivePath!);
  await expect(page.getByText(/Arquivo válido/)).toBeVisible();
  await expect(page.getByText(/Resumo:/)).toBeVisible();
  await page.getByRole('button', { name: 'Importar como cópia' }).click();
  await expect(page.getByText(/Importação concluída sem substituir/)).toBeVisible({ timeout: 30_000 });
});
