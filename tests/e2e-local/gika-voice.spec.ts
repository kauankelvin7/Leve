import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Recognition } from '../../apps/web/src/features/gika/useVoiceInput';

type VoiceBrowser = Window & { __voice: { starts: number; aborts: number; current: Recognition | null } };
async function speech(page: Page, denied = false) {
  await page.addInitScript(({ denied }) => {
    const browser = window as unknown as VoiceBrowser;
    browser.__voice = { starts: 0, aborts: 0, current: null };
    class Native implements Recognition {
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
      onstart: Recognition['onstart'] = null; onspeechend: Recognition['onspeechend'] = null;
      onresult: Recognition['onresult'] = null; onerror: Recognition['onerror'] = null; onend: Recognition['onend'] = null;
      start() { browser.__voice.starts++; browser.__voice.current = this; queueMicrotask(() => denied ? this.onerror?.({ error: 'not-allowed' }) : this.onstart?.()); }
      stop() { /* Final/end events are explicitly controlled by the test. */ }
      abort() { browser.__voice.aborts++; }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Native, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
  }, { denied });
}
async function enter(page: Page) {
  await page.goto('/entrar'); await page.getByLabel('E-mail').fill('leve.local@example.test'); await page.getByLabel('Senha', { exact: true }).fill('leve-local-123'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('#page-title')).toHaveText(/Finalize sua agenda|Meu dia/);
  if (await page.getByRole('heading', { name: 'Finalize sua agenda' }).count()) await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia'); const skip = page.getByRole('button', { name: 'Pular guia', exact: true });
  await skip.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined); if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
}
async function finish(page: Page, text: string) {
  await page.evaluate(text => {
    const native = (window as unknown as VoiceBrowser).__voice.current!;
    native.onresult?.({ results: [{ isFinal: true, 0: { transcript: text } }] }); native.onspeechend?.(); native.onend?.();
  }, text);
}

test('M7-T1 explicit gesture, accessible listening, editable final and conscious textual send', async ({ page }) => {
  await speech(page); await enter(page); let requests = 0, commands = 0;
  page.on('request', request => { if (request.url().endsWith('/api/commands')) commands++; });
  await page.route('**/api/gika/respond', route => {
    requests++; const body = route.request().postDataJSON(); expect(Object.keys(body).sort()).toEqual(['requestId', 'text']); expect(body.text).toBe('O que eu tenho hoje?');
    return route.fulfill({ json: { text: 'Veja sua agenda para hoje.', simulated: false, reads: [] } });
  });
  expect(await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.starts)).toBe(0);
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await page.getByRole('button', { name: 'Usar voz', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#gika-voice-status')).toHaveText('Ouvindo…'); await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeDisabled();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await finish(page, 'o que eu tenho hoje'); await expect(input).toHaveValue('o que eu tenho hoje'); await expect(input).toBeEditable();
  expect(requests).toBe(0); expect(commands).toBe(0); await input.fill('O que eu tenho hoje?'); await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).click();
  await expect(page.locator('.gika-message.is-assistant')).toContainText('Veja sua agenda'); expect(requests).toBe(1); expect(commands).toBe(0);
});
test('M7-T1 cancellation ignores a late final and preserves typed text', async ({ page }) => {
  await speech(page); await enter(page); let requests = 0; page.on('request', request => { if (/\/api\/(?:gika|commands)/u.test(request.url())) requests++; });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await input.fill('Já digitado'); await page.getByRole('button', { name: 'Usar voz', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar voz', exact: true }).click(); await finish(page, 'academia amanhã'); await expect(input).toHaveValue('Já digitado'); expect(requests).toBe(0);
  expect(await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.aborts)).toBe(1);
});
test('M7-T1 denied microphone leaves textual composer functional without requests', async ({ page }) => {
  await speech(page, true); await enter(page); let requests = 0; page.on('request', request => { if (/\/api\/(?:gika|commands)/u.test(request.url())) requests++; });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await input.fill('Preservado'); await page.getByRole('button', { name: 'Usar voz', exact: true }).click();
  await expect(page.locator('#gika-voice-status')).toContainText('não foi autorizado'); await expect(input).toHaveValue('Preservado'); await expect(input).toBeEditable(); await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeEnabled(); expect(requests).toBe(0);
});
