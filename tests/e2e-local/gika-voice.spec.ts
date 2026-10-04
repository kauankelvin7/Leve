import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Recognition } from '../../apps/web/src/features/gika/useVoiceInput';

type VoiceBrowser = Window & { __voice: { starts: number; aborts: number; current: Recognition | null; late?: { result: Recognition['onresult']; end: Recognition['onend'] } } };
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
  await expect(page.locator('#gika-voice-status')).toHaveText('Ouvindo…'); await expect(page.locator('.gika-character')).toHaveAttribute('data-character-state', 'listening'); await expect(page.getByRole('button', { name: 'Enviar pergunta', exact: true })).toBeDisabled();
  expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await finish(page, 'o que eu tenho hoje'); await expect(page.locator('.gika-character')).toHaveAttribute('data-character-state', 'idle'); await expect(input).toHaveValue('o que eu tenho hoje'); await expect(input).toBeEditable();
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

test('M7-T2 unsupported browser keeps normal text sending without capture', async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) Object.defineProperty(window, name, { value: undefined, configurable: true });
  });
  await enter(page); const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true });
  await expect(page.getByRole('button', { name: 'Usar voz', exact: true })).toBeDisabled(); await expect(page.locator('#gika-voice-status')).toContainText('Voz não disponível');
  await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Resposta pelo fluxo textual.', simulated: false, reads: [] } }));
  await input.fill('o que eu tenho hoje'); await input.press('Enter'); await expect(page.locator('.gika-message.is-assistant')).toContainText('Resposta pelo fluxo textual');
});
test('M7-T2 offline aborts capture, preserves draft and reconnect never sends or restarts', async ({ page, context }) => {
  await speech(page); await enter(page); let requests = 0; page.on('request', request => { if (/\/api\/(?:gika|commands)/u.test(request.url())) requests++; });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await input.fill('Preservado'); await page.getByRole('button', { name: 'Usar voz', exact: true }).click(); await expect(page.locator('#gika-voice-status')).toHaveText('Ouvindo…');
  await context.setOffline(true); await expect(page.getByRole('button', { name: 'Usar voz', exact: true })).toBeDisabled(); await finish(page, 'organiza meu dia'); await expect(input).toHaveValue('Preservado');
  await context.setOffline(false); await expect(page.getByRole('button', { name: 'Usar voz', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => ({ starts: (window as unknown as VoiceBrowser).__voice.starts, aborts: (window as unknown as VoiceBrowser).__voice.aborts }))).toEqual({ starts: 1, aborts: 1 }); expect(requests).toBe(0);
});
test('M7-T2 logout and another UID discard late speech without text or requests', async ({ page }) => {
  await speech(page); await enter(page); let requests = 0; page.on('request', request => { if (/\/api\/(?:gika|commands)/u.test(request.url())) requests++; });
  await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill('Primeira conta'); await page.getByRole('button', { name: 'Usar voz', exact: true }).click();
  await page.evaluate(async () => {
    const state = (window as unknown as VoiceBrowser).__voice; state.late = { result: state.current!.onresult, end: state.current!.onend };
    const path = '/src/platform/firebase.ts'; const { firebaseAuth } = await import(/* @vite-ignore */ path); await firebaseAuth.signOut();
  });
  await expect(page.getByRole('heading', { name: 'Entre na sua agenda', exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click(); await page.getByLabel('Seu nome').fill('Conta voz sintética'); await page.getByLabel('E-mail').fill(`voz.${crypto.randomUUID()}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('gika-local-123'); await page.getByLabel('Confirmar senha', { exact: true }).fill('gika-local-123'); await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar neste ambiente', exact: true }).click(); await page.getByRole('button', { name: 'Criar minha agenda', exact: true }).click(); await expect(page.locator('#page-title')).toHaveText('Meu dia'); await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
  const afterAccountSetup = requests; // Conventional activation is separate from the voice boundary.
  await page.evaluate(() => { const late = (window as unknown as VoiceBrowser).__voice.late!; late.result?.({ results: [{ isFinal: true, 0: { transcript: 'Não deve entrar' } }] }); late.end?.(); });
  await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toHaveValue(''); expect(requests).toBe(afterAccountSetup);
  expect(await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.aborts)).toBe(1);
});
test('M7-T2 mobile dark append, double start, processing, cancellation and layout are accessible', async ({ page }) => {
  await speech(page); await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); await enter(page);
  await page.evaluate(async () => { const path = '/src/platform/theme.ts'; const theme = await import(/* @vite-ignore */ path); theme.applyAppearance('dark'); });
  let requests = 0; page.on('request', request => { if (/\/api\/(?:gika|commands)/u.test(request.url())) requests++; });
  const input = page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }); await input.fill('Já digitado');
  await page.getByRole('button', { name: 'Usar voz', exact: true }).click(); await expect(page.locator('#gika-voice-status')).toHaveText('Ouvindo…');
  await expect(page.locator('#gika-voice-status')).toBeInViewport(); await expect(page.locator('#gika-voice-privacy')).toHaveCount(0);
  expect(await page.locator('#gika-voice-status').evaluate(element => getComputedStyle(element).clipPath)).toBe('none');
  await page.screenshot({ path: '/tmp/leve-m7-mobile-dark-listening.png' }); expect((await new AxeBuilder({ page }).include('.gika-panel').analyze()).violations).toEqual([]);
  await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.current!.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'academia amanhã' } }] }));
  await expect(page.locator('#gika-voice-status')).toHaveText('Preparando o texto…'); await input.press('Enter'); expect(requests).toBe(0);
  await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.current!.onend?.()); await expect(input).toHaveValue('Já digitado academia amanhã'); await expect(input).toBeEditable(); expect(requests).toBe(0);
  expect(await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, composerBottom: document.querySelector('.gika-composer')!.getBoundingClientRect().bottom > innerHeight }))).toEqual({ overflow: false, composerBottom: false });
  await page.getByRole('button', { name: 'Usar voz', exact: true }).dblclick(); await expect.poll(() => page.evaluate(() => (window as unknown as VoiceBrowser).__voice.starts)).toBe(2);
  await expect(page.locator('#gika-voice-status')).toContainText('cancelada'); expect(await page.evaluate(() => (window as unknown as VoiceBrowser).__voice.aborts)).toBe(1);
  await expect(input).toHaveValue('Já digitado academia amanhã'); expect(requests).toBe(0);
});
