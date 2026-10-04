import { test, expect, type Page } from '@playwright/test';
import { isolatedTestAccount } from '../helpers/gikaBatch';
import { inspect, setAppearance } from '../../scripts/glass/probe';
import { measureColor } from '../../scripts/glass/color.mjs';
import AxeBuilder from '@axe-core/playwright';
import { measureIncompleteContrast } from '../../scripts/glass/contrast.mjs';

// The general glyph-mask probe deliberately refuses forced-color native fields.
// Verify this opaque UA-painted control independently, without repainting it or
// changing the probe's UNMEASURED contract. Both computed colors must be present
// in the actual interior screenshot; unsupported compositing fails this proof.
async function forcedControlPaint(page: Page) {
  const field = page.locator('#gika-question');
  const paint = await field.evaluate(element => {
    const field = element as HTMLTextAreaElement;
    const text = getComputedStyle(field, field.value ? null : '::placeholder');
    let background = '';
    for (let ancestor: HTMLElement | null = field; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.opacity !== '1' || style.filter !== 'none' || style.mixBlendMode !== 'normal' || style.backgroundImage !== 'none') throw Error('Unsupported control compositing');
      if (!background && !['rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor)) background = style.backgroundColor;
      if (ancestor.matches('.gika-panel')) break;
    }
    if (text.opacity !== '1' || text.forcedColorAdjust !== 'auto') throw Error('Expected opaque system-painted text');
    return { foreground: text.color, background };
  });
  const foreground = await page.evaluate(measureColor, paint.foreground);
  const background = await page.evaluate(measureColor, paint.background);
  expect(foreground.alpha).toBe(1); expect(background.alpha).toBe(1);
  const png = (await field.screenshot({ animations: 'disabled' })).toString('base64');
  const counts = await page.evaluate(async ({ png, foreground, background }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })!; context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let ink = 0, paper = 0;
    // Exclude the outer border/focus ring; retain the text and its immediate fill.
    for (let y = 6; y < bitmap.height - 6; y++) for (let x = 8; x < bitmap.width - 8; x++) {
      const index = (y * bitmap.width + x) * 4;
      const matches = (color: number[]) => color.slice(0, 3).every((channel, offset) => Math.abs(channel - data[index + offset]!) <= 1);
      // Include antialiased glyph edges only when their RGB channels match
      // the observed text/fill blend, rather than counting arbitrary dark pixels.
      const axis = foreground.slice(0, 3).map((channel, offset) => Math.abs(channel - background[offset]!)).indexOf(Math.max(...foreground.slice(0, 3).map((channel, offset) => Math.abs(channel - background[offset]!))));
      const coverage = (data[index + axis]! - background[axis]!) / (foreground[axis]! - background[axis]!);
      if (coverage >= 0.2 && coverage <= 1.01 && foreground.slice(0, 3).every((channel, offset) => Math.abs(background[offset]! + coverage * (channel - background[offset]!) - data[index + offset]!) <= 2)) ink++;
      if (matches(background)) paper++;
    }
    bitmap.close(); return { ink, paper };
  }, { png, foreground: foreground.rgba, background: background.rgba });
  expect(counts.ink).toBeGreaterThan(100); expect(counts.paper).toBeGreaterThan(100);
  const luminance = (rgba: number[]) => rgba.slice(0, 3).map(channel => {
    const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
  const a = luminance(foreground.rgba), b = luminance(background.rgba);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  return { paint, counts, ratio };
}

async function login(page: Page, appearance: 'light' | 'dark') {
  const email = await isolatedTestAccount('glass-material');
  await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('leve-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Finalize sua agenda' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar minha agenda' }).click();
  await expect(page.locator('#page-title')).toHaveText('Meu dia');
  await page.getByRole('button', { name: 'Pular guia', exact: true }).click();
  await setAppearance(page, appearance);
}

async function material(page: Page, selector: string) {
  const paint = await page.locator(selector).evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, filter: style.backdropFilter, webkit: style.getPropertyValue('-webkit-backdrop-filter') };
  });
  return { ...paint, alpha: (await page.evaluate(measureColor, paint.background)).alpha };
}

for (const width of [390, 853, 1366]) for (const appearance of ['light', 'dark'] as const) {
  test(`glass material ${width} ${appearance}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, appearance);
    const navigation = await material(page, '.sidebar');
    if (width < 740) {
      expect(navigation.filter).toContain('blur(16px)');
      expect(navigation.alpha).toBeGreaterThanOrEqual(0.8);
      expect(navigation.alpha).toBeLessThanOrEqual(0.85);
    } else {
      expect(navigation.filter).toBe('none');
      expect(navigation.alpha).toBe(1);
    }
    await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
    await expect(page.locator('.gika-panel')).toBeVisible();
    const panel = await material(page, '.gika-panel');
    if (width < 740) {
      expect(panel.filter).toBe('none');
      expect(panel.alpha).toBe(1);
    } else {
      expect(panel.filter).toContain('blur(22px)');
      expect(panel.alpha).toBeGreaterThanOrEqual(0.85);
      expect(panel.alpha).toBeLessThanOrEqual(0.9);
    }
    // Reading/actions remain opaque; no second blur inside the panel.
    expect((await material(page, '.gika-composer')).alpha).toBe(1);
    expect((await material(page, '.gika-composer')).filter).toBe('none');
    await inspect(page, `material-welcome-${width}-${appearance}`);
    await page.route('**/api/gika/respond', route => route.fulfill({ json: { text: 'Consulta sintética para verificar a leitura.', simulated: false, reads: [] } }));
    await page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true }).fill('Minha agenda');
    await page.getByRole('button', { name: 'Enviar pergunta', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Consulta sintética para verificar a leitura.', { exact: true })).toBeVisible();
    await inspect(page, `material-chat-${width}-${appearance}`);
    await page.getByRole('button', { name: 'Fechar Gika', exact: true }).click();
    await page.getByRole('link', { name: 'Calendário', exact: true }).first().click();
    await page.getByRole('button', { name: 'Mês', exact: true }).click();
    await expect(page.locator('.calendar-grid')).toBeVisible();
    expect((await material(page, '.calendar-grid')).alpha).toBe(1);
    expect((await material(page, '.calendar-grid')).filter).toBe('none');
    if (width < 740) {
      await page.locator('.calendar-day[aria-pressed="true"]').click();
      await expect(page.locator('.calendar-agenda.open')).toBeVisible();
      const sheet = await material(page, '.calendar-agenda.open');
      expect(sheet.filter).toContain('blur(22px)');
      expect(sheet.alpha).toBeGreaterThanOrEqual(0.85);
      expect(sheet.alpha).toBeLessThanOrEqual(0.9);
      expect((await material(page, '.calendar-agenda .empty')).alpha).toBe(1);
      await inspect(page, `material-sheet-${width}-${appearance}`);
    }
  });
}

for (const appearance of ['light', 'dark'] as const) for (const mode of ['solid', 'highContrast', 'reducedTransparency', 'forcedColors', 'unsupported', 'text200'] as const) for (const width of mode === 'text200' ? [390, 853] : [853]) {
  test(`glass material fallback ${mode} ${width} ${appearance}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1280 });
    await login(page, appearance);
    if (mode === 'solid' || mode === 'highContrast') {
      await page.getByRole('link', { name: 'Perfil e preferências', exact: true }).first().click();
      await page.getByLabel(mode === 'solid' ? 'Reduzir transparência' : 'Aumentar contraste', { exact: true }).check();
      await page.getByRole('button', { name: 'Salvar preferências' }).click();
      await expect(page.locator('.app-shell')).toHaveClass(mode === 'solid' ? /solid/ : /high-contrast/);
    }
    if (mode === 'reducedTransparency') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    }
    if (mode === 'forcedColors') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'unsupported') {
      // Exercise the real base rules without applying the progressive enhancement.
      // Chromium itself still supports blur; this is a fallback-branch test.
      const removed = await page.evaluate(() => {
        let count = 0;
        for (const sheet of document.styleSheets) for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
          const rule = sheet.cssRules[index];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes('backdrop-filter')) { sheet.deleteRule(index); count++; }
        }
        return count;
      });
      expect(removed).toBeGreaterThan(0);
    }
    if (mode === 'text200') await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.getByRole('button', { name: 'Pergunte à Gika', exact: true }).click();
    await expect(page.locator('.gika-panel')).toBeVisible();
    const panel = await material(page, '.gika-panel');
    if (mode === 'text200' && width >= 740) expect(panel.filter).toContain('blur(22px)');
    else { expect(panel.filter).toBe('none'); expect(['', 'none']).toContain(panel.webkit); expect(panel.alpha).toBe(1); }
    if (mode === 'forcedColors') {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(axe.violations).toEqual([]);
      for (const rule of axe.incomplete.filter(rule => rule.id === 'color-contrast')) for (const node of rule.nodes) {
        const measurement = await measureIncompleteContrast(page, node.target);
        if (node.target.length === 1 && node.target[0] === '#gika-question') expect(measurement).toEqual({ status: 'UNMEASURED', reason: 'FORCED_TEXT_CONTROL' });
        else expect(measurement.status).toBe('PASS');
      }
      const placeholder = await forcedControlPaint(page);
      await page.locator('#gika-question').fill('Consulta sintética');
      const value = await forcedControlPaint(page);
      await testInfo.attach('forced-control-paint', { body: JSON.stringify({ placeholder, value }), contentType: 'application/json' });
      await testInfo.attach('forced-colors-viewport', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
      expect(await page.evaluate(() => [...document.querySelectorAll('*')].some(element => getComputedStyle(element).backdropFilter !== 'none'))).toBe(false);
    } else await inspect(page, `material-${mode}-${width}-${appearance}`, mode !== 'text200');
    await expect(page.getByRole('textbox', { name: 'Pergunte à Gika', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fechar Gika', exact: true })).toBeVisible();
  });
}
