import { expect, test, type Page } from '@playwright/test';

async function enter(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
}

test('notification capability is useful and does not fall back for mixed scheduling requests', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Poderia agendar para amanhã às 19:00 que eu tenho que ir pra academia, preciso que me notifique');
  await question.press('Enter');
  const assistant = page.locator('.gika-message.is-assistant').last();
  await expect(assistant).toContainText('notificação automática');
  await expect(assistant).toContainText('horário');
  await expect(page.getByText('Resposta indisponível', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/leve-gika-notification-mobile.png', fullPage: true });

  await question.fill('Quero ser notificado o dia todo');
  await question.press('Enter');
  await expect(page.locator('.gika-message.is-assistant').last()).toContainText('não há um aviso contínuo');
  await expect(page.getByText('Resposta indisponível', { exact: true })).toHaveCount(0);
});
