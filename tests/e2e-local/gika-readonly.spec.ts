import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function enter(page: Page) {
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
}
const read = { startDate: '2026-10-01', endDate: '2026-10-01', timeZone: 'America/Sao_Paulo', partial: false, cached: false, items: [{ id: 'fixture-task', revision: 1, title: 'Leitura <script>não executar</script>', kind: 'task', status: 'pending', schedule: { type: 'task', dueDate: '2026-10-01', dueTime: '09:00', timeZone: 'America/Sao_Paulo', disambiguation: 'reject' }, seriesId: null, occurrenceKey: null }] };

test('missing env real: fallback preserva draft e agenda convencional', async ({ page }) => {
  await enter(page);
  let result: { status: number; code: string } | undefined;
  page.on('response', async response => { if (response.url().endsWith('/api/gika/respond')) result = { status: response.status(), code: (await response.json()).code }; });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('O que tenho hoje?'); await question.press('Enter');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  expect(result).toEqual({ status: 503, code: 'GIKA_NOT_CONFIGURED' });
  await expect(question).toHaveValue('O que tenho hoje?');
  await page.getByRole('button', { name: 'Fechar Gika' }).click();
  await page.getByRole('link', { name: 'Calendário', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText('Calendário');
  await page.getByRole('link', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Agenda continua disponível');
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Agenda continua disponível');
});

test('contrato real mostra tool result escapado, sem confirmação/undo ou commands', async ({ page }) => {
  await enter(page);
  const commands: string[] = []; page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/commands')) commands.push(request.url()); });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Veja sua agenda para o período consultado.', simulated: false, reads: [read] } }));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  await page.getByRole('button', { name: 'O que tenho amanhã?', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar pergunta' }).click();
  const result = page.getByRole('region', { name: 'Agenda de 01/10/2026' });
  await expect(result).toBeVisible(); await expect(result).toContainText(read.items[0]!.title);
  await expect(result).toContainText('09:00');
  await expect(page.locator('.gika-panel script')).toHaveCount(0);
  await expect(page.locator('.gika-confirmation, .gika-undo')).toHaveCount(0);
  expect(commands).toEqual([]);
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
});

test('mobile dark: partial/empty honestos, composer fixo e scroll separado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await enter(page);
  await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Esta consulta mostra parte da sua agenda.', simulated: false, reads: [{ ...read, partial: true, items: [] }] } }));
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await question.fill('Minha semana'); await question.press('Enter');
  await expect(page.locator('.gika-result')).toContainText('Consulta parcial');
  await expect(page.locator('.gika-result')).toContainText('Não há itens nesta parte da consulta.');
  await expect(page.locator('.gika-result')).not.toContainText('Nada planejado');
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('.gika-panel')!; const composer = document.querySelector('.gika-composer')!; const content = document.querySelector('.gika-content')!;
    return { panelWidth: panel.clientWidth, scrollWidth: panel.scrollWidth, bottom: composer.getBoundingClientRect().bottom, height: innerHeight, overflow: getComputedStyle(content).overflowY };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.panelWidth + 1); expect(layout.bottom).toBeLessThanOrEqual(layout.height); expect(layout.overflow).toBe('auto');
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/leve-m2-mobile-readonly.png' });
});

test('429 e saída com command/preview real rejeitadas sem mutar', async ({ page }) => {
  await enter(page); let attempt = 0; const commands: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/commands')) commands.push(request.url()); });
  await page.route('**/api/gika/respond', route => { attempt++; return route.fulfill(attempt === 1 ? { status: 429, json: { code: 'GIKA_QUOTA', message: 'Quota' } } : { json: { text: 'Tarefa criada.', simulated: false, reads: [], command: 'activity.create', preview: 'organize-demo' } }); });
  await page.getByRole('button', { name: 'Pergunte à Gika' }).click();
  const question = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await question.fill('Adicionar uma tarefa'); await question.press('Enter');
  await expect(page.locator('.gika-feedback')).toContainText('limite de consultas');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('.gika-feedback')).toContainText('Não consegui responder');
  await expect(page.locator('.gika-message.is-assistant')).toHaveCount(0); await expect(page.locator('.gika-message.is-user')).toHaveCount(1);
  await expect(question).toHaveValue('Adicionar uma tarefa'); expect(commands).toEqual([]);
});
