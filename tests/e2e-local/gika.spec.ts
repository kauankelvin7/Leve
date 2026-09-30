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
  await expect(question).toHaveValue('Academia amanhã');
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
