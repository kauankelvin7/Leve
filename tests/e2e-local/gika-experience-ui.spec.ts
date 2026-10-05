import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openGika(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('leve.local@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
}
const reply = (text: string) => ({ text, simulated: false, intent: 'conversation', reads: [] });

test('stopping a response preserves draft and retries the same identity without duplicate messages', async ({ page }) => {
  await openGika(page);
  const requests: { requestId: string; text: string }[] = [];
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/api/gika/respond', route => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) { finish = () => route.fulfill({ json: reply('Resposta tardia') }).catch(() => undefined); return; }
    return route.fulfill({ json: reply('Podemos organizar seu dia.') });
  });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill('Meu dia está confuso'); await input.press('Enter');
  const stop = page.getByRole('button', { name: 'Parar resposta', exact: true });
  await expect(stop).toBeEnabled(); await expect.poll(() => Boolean(finish)).toBe(true);
  await expect(page.locator('#gika-composer-hint')).toHaveText('Parar a resposta não desfaz alterações já enviadas.');
  await stop.click(); await finish!();
  expect(requests).toHaveLength(1);
  await expect(input).toBeFocused(); await expect(input).toHaveValue('Meu dia está confuso'); await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0);
  await input.press('Enter'); await expect(page.locator('.gika-message.is-assistant')).toContainText('Podemos organizar');
  expect(requests).toHaveLength(2); expect(requests[1]!.requestId).toBe(requests[0]!.requestId);
  await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
});

test('a new response preserves reading position until the explicit jump, then follows the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await openGika(page);
  let count = 0; let finish: (() => Promise<void>) | undefined;
  await page.route('**/api/gika/respond', route => {
    count++;
    if (count === 4) { finish = () => route.fulfill({ json: reply('Nova resposta. '.repeat(50)) }); return; }
    return route.fulfill({ json: reply('Uma resposta mais longa para conferir a leitura da conversa. '.repeat(14)) });
  });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  const transcript = page.getByRole('region', { name: 'Conversa com Gika', exact: true });
  for (let index = 1; index <= 3; index++) {
    await input.fill(`Como organizar meu dia ${index}?`); await input.press('Enter');
    await expect(page.locator('.gika-message.is-assistant')).toHaveCount(index);
  }
  await input.fill('E minhas prioridades?'); await input.press('Enter');
  await expect.poll(() => Boolean(finish)).toBe(true);
  await transcript.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
  await expect.poll(() => transcript.evaluate(element => element.scrollTop)).toBe(0);
  await finish!(); await expect(page.locator('.gika-message.is-assistant')).toHaveCount(4);
  await expect(transcript).toHaveJSProperty('scrollTop', 0);
  const jump = page.getByRole('button', { name: 'Ver resposta', exact: true });
  await expect(jump).toBeInViewport(); await jump.click();
  await expect(input).toBeFocused(); await expect(jump).toHaveCount(0);
  await expect.poll(() => transcript.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(1);
  await input.fill('Como começo?'); await input.press('Enter');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(5);
  await expect.poll(() => transcript.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(1);
});

test('mobile dark and 200 percent reflow retain usable composer, stop control and accessible dialog', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await openGika(page);
  await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  let requests = 0;
  await page.route('**/api/gika/respond', () => { requests++; });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await input.fill('Organiza meu dia'); await input.press('Enter');
  const stop = page.getByRole('button', { name: 'Parar resposta', exact: true });
  await expect(stop).toBeInViewport(); await expect(input).toBeInViewport();
  expect(await page.locator('#gika-dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await stop.click(); await expect(input).toHaveValue('Organiza meu dia');
  await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeEnabled();
  expect(requests).toBe(1);
});
