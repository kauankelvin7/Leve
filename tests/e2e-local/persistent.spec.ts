import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('cadastro, verificação, convite, recuperação, saída e nova entrada funcionam pela interface', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto('/registrar');
  await expect(page.getByRole('heading', { name: 'Crie seu acesso' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Seu nome').fill('Cadastro local');
  await page.getByLabel('E-mail').fill('cadastro.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('cadastro-local-123');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('senhas-diferentes');
  await page.getByLabel('Código do convite').fill('cadastro-local.cadastro-local-seguro-123456789');
  await page.getByRole('button', { name: 'Criar e verificar e-mail' }).click();
  await expect(page.getByRole('alert')).toContainText('As senhas não coincidem.');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('cadastro-local-123');
  await page.getByRole('button', { name: 'Criar e verificar e-mail' }).click();
  await expect(page.getByText(/Enviamos a confirmação para/)).toContainText('cadastro.local@example.test');

  const codesResponse = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-leve/oobCodes');
  const codes = await codesResponse.json() as { oobCodes: Array<{ email: string; oobCode: string; requestType: string }> };
  const verification = codes.oobCodes.find(code => code.email === 'cadastro.local@example.test' && code.requestType === 'VERIFY_EMAIL');
  expect(verification).toBeTruthy();
  const verificationResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=local-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode: verification!.oobCode }),
  });
  expect(verificationResponse.ok).toBeTruthy();

  await page.getByRole('button', { name: 'Já confirmei' }).click();
  await expect(page.getByRole('heading', { name: 'Ative seu espaço' })).toBeVisible();
  await expect(page.getByLabel('Seu nome')).toHaveValue('Cadastro local');
  await expect(page.getByLabel('Código do convite')).toHaveValue('cadastro-local.cadastro-local-seguro-123456789');
  await page.getByRole('button', { name: 'Ativar minha agenda' }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar acesso' })).toBeVisible();
  await page.getByLabel('E-mail').fill('cadastro.local@example.test');
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByText(/você receberá as instruções/)).toBeVisible();
  const resetCodesResponse = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-leve/oobCodes');
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

test('login, convite e atividade sobrevivem ao reload', async ({ page }) => {
  const pageErrors: string[] = [];
  const suffix = Date.now();
  const activityTitle = `Atividade persistente ${suffix}`;
  const noteTitle = `Nota persistente ${suffix}`;
  const noteText = `Conteúdo salvo com segurança ${suffix}.`;
  const listTitle = `Mercado ${suffix}`;
  const categoryName = `Trabalho ${suffix}`;
  const today = new Date().toISOString().slice(0, 10);
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'Entre na sua agenda' })).toBeVisible();
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Ative seu espaço|Meu dia/ })).toBeVisible();
  if (await page.getByRole('heading', { name: 'Ative seu espaço' }).count()) {
    await page.getByLabel('Seu nome').fill('Conta local');
    await page.getByLabel('Código do convite').fill('convite-local.convite-local-seguro-123456789');
    await page.getByRole('button', { name: 'Ativar minha agenda' }).click();
  }
  await expect(page).toHaveURL(/\/hoje$/);
  await page.getByLabel('Título').fill(activityTitle);
  await page.getByLabel('Data').fill(today);
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  const checkbox = page.getByRole('checkbox', { name: new RegExp(activityTitle) });
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  await page.getByRole('navigation').getByRole('link', { name: 'Calendário' }).click();
  await expect(page.getByText(activityTitle, { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Notas' }).click();
  await page.getByLabel('Título').fill(noteTitle);
  await page.getByLabel('Texto').fill(noteText);
  await page.getByRole('button', { name: 'Salvar nota' }).click();
  await expect(page.getByText(noteText)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: noteTitle })).toBeVisible();
  const note = page.locator('article').filter({ hasText: noteTitle });
  await note.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Texto').fill(`${noteText} Editado.`);
  await page.getByRole('button', { name: 'Atualizar nota' }).click();
  await expect(page.getByText(`${noteText} Editado.`)).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Compras' }).click();
  await page.getByLabel('Nome da lista').fill(listTitle);
  await page.getByRole('button', { name: 'Criar lista' }).click();
  await page.getByRole('link', { name: new RegExp(listTitle) }).click();
  await page.getByLabel('Novo item').fill('Arroz');
  await page.getByRole('button', { name: 'Adicionar item' }).click();
  await expect(page.getByText('Arroz', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Arroz' }).click();
  await expect(page.getByRole('checkbox', { name: 'Arroz' })).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Arroz' })).toBeChecked();

  await page.getByRole('link', { name: /Preferências/ }).click();
  await page.getByLabel('Nome', { exact: true }).first().fill('Conta local atualizada');
  await page.getByLabel('Reduzir transparência').check();
  await page.getByRole('button', { name: 'Salvar preferências' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/solid/);
  await page.getByLabel('Nome', { exact: true }).last().fill(categoryName);
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Meu dia' }).click();
  await page.getByLabel('Tipo').selectOption('event');
  await page.getByLabel('Título').fill('Compromisso persistente');
  await page.getByLabel('Categoria').selectOption({ label: categoryName });
  await page.getByLabel('Início').fill(today);
  await page.getByLabel('Horário', { exact: true }).fill('10:00');
  await page.getByLabel('Fim').fill(today);
  await page.getByLabel('Horário final').fill('11:00');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await expect(page.getByText('Compromisso persistente', { exact: true })).toBeVisible();
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
