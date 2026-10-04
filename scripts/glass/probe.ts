import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { timeGlassOperation, withGlassScope } from './timing.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { measureColor } from './color.mjs';
import { measureIncompleteContrast, type ContrastMeasurement } from './contrast.mjs';
export const viewports = [[390,844],[853,1280],[1024,768],[1366,768],[1920,1080],[2560,1440]] as const;
const manifest = JSON.parse(await readFile(process.env.GLASS_MANIFEST ?? 'glass.manifest.json','utf8')) as { components: {id:string;selector:string;scope:string}[] };
export const phase = process.env.GLASS_PHASE === 'before' ? 'before' : 'after';
export async function inspect(page: Page, name: string, solid = false) {
  return withGlassScope(name, () => timeGlassOperation('inspect', async () => {
    // Measure the native loaded font and settled finite UI transition, as the
    // existing design suite does. No sleep, retry, or altered product timing.
    await timeGlassOperation('settle', () => page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
    }));
    const result = await timeGlassOperation('scan', () => page.evaluate(({ solid, components, complete }) => {
      const errors: string[] = [], colors: {element:string;background:string;foreground:string}[] = [], filters: unknown[] = [];
      const visible = (e: Element) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const active = (e: Element) => { const s = getComputedStyle(e); return [s.backdropFilter, s.getPropertyValue('-webkit-backdrop-filter')].some(v => v && v !== 'none'); };
      for (const e of document.querySelectorAll('*')) {
        if (!visible(e)) continue;
        const s = getComputedStyle(e), r = e.getBoundingClientRect();
        const label = e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].join('.') : '');
        if (active(e)) {
          const filter = s.backdropFilter || s.getPropertyValue('-webkit-backdrop-filter');
          const approved = components.filter(component => e.matches(component.selector));
          filters.push({ element: label, filter, area: Math.round(r.width * r.height), manifestIds: approved.map(component=>component.id) });
          if (complete && !approved.length) errors.push(`UNAPPROVED_FILTER: ${label}`);
          if (approved.some(component=>component.scope==='max-width:739px') && innerWidth>739) errors.push(`FILTER_SCOPE: ${label}`);
          if (solid) errors.push(`SOLID_FILTER_LEAK: ${label}`);
          for (const m of filter.matchAll(/blur\(([\d.]+)px\)/g)) if (Number(m[1]) > 24) errors.push(`MAX_BLUR_24: ${label}`);
          for (let p = e.parentElement; p; p = p.parentElement) if (active(p)) { errors.push(`NESTED_FILTER: ${label}`); break; }
        }
        if (e.matches('.glass-pressable') && (r.width < 44 || r.height < 44)) errors.push(`TOUCH_TARGET_44: ${label}`);
        if (e.matches('[class*="glass"], .gika-panel, .gika-launcher, .sidebar, .auth-entry') || ([...e.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) && e.closest('[class*="glass"], .gika-panel, .gika-launcher, .sidebar, .auth-entry'))) {
          colors.push({ element: label, background: s.backgroundColor, foreground: s.color });
        }
      }
      return { errors, colors, filters, domNodes: document.querySelectorAll('*').length,
        metrics: (window as unknown as {glassMetrics?: unknown}).glassMetrics ?? null,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    }, { solid, components: manifest.components, complete: process.env.GLASS_COMPLETE === '1' }));
    const measuredColors: unknown[] = [];
    const parsedColors = new Map<string, unknown>();
    const parseColor = async (value: string) => { if (!parsedColors.has(value)) parsedColors.set(value,await page.evaluate(measureColor,value)); return parsedColors.get(value); };
    await timeGlassOperation('colors', async () => {
      for (const color of result.colors) {
        try { measuredColors.push({ element: color.element, background: await parseColor(color.background), foreground: await parseColor(color.foreground) }); }
        catch { result.errors.push(`UNMEASURED_COLOR: ${color.element}`); }
      }
    });
    const axe = await timeGlassOperation('axe', () => new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze());
    const directory = `.cache/glass/${phase}`; await mkdir(directory, { recursive: true });
    const summarize = (rules: typeof axe.violations) => rules.map(rule => ({ id: rule.id, impact: rule.impact, targets: rule.nodes.map(node => node.target) }));
    const unresolvedContrast = axe.incomplete.filter(rule => rule.id === 'color-contrast' && rule.nodes.length);
    const contrastMeasurements: (ContrastMeasurement & { targetIndex: number })[] = [];
    for (const rule of unresolvedContrast) for (const node of rule.nodes) {
      const measurement = await timeGlassOperation('contrast.target', () => measureIncompleteContrast(page, node.target));
      const targetIndex = contrastMeasurements.length;
      contrastMeasurements.push({ targetIndex, ...measurement });
      if (measurement.status !== 'PASS') result.errors.push(`${measurement.status === 'FAIL' ? 'CONTRAST_RATIO' : 'UNMEASURED_CONTRAST'}: incomplete target ${targetIndex}`);
    }
    await timeGlassOperation('artifact.json', () => writeFile(`${directory}/${name}.json`, JSON.stringify({ ...result, colors: measuredColors, contrastMeasurements, axe: { violations: summarize(axe.violations), incomplete: summarize(axe.incomplete) }, phase, verification: phase === 'before' ? 'BASELINE_ONLY' : 'STRICT' }, null, 2)));
    if (process.env.GLASS_CAPTURE === '1') {
      await timeGlassOperation('capture.viewport', () => page.screenshot({ path: `${directory}/${name}-viewport.png`, animations: 'disabled' }));
      // Chromium full-page capture can paint offscreen fixed elements at scrollY.
      // Capture from the document origin, then restore the interaction's scroll.
      const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      try {
        await page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }));
        await timeGlassOperation('capture.fullPage', () => page.screenshot({ path: `${directory}/${name}.png`, fullPage: true, animations: 'disabled' }));
      } finally {
        await page.evaluate(position => window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' }), scroll);
      }
    }
    if (phase !== 'before') {
      expect.soft(result.errors, name).toEqual([]);
      expect.soft(result.horizontalOverflow, `${name}: reflow`).toBe(false);
      expect.soft(summarize(axe.violations), `${name}: Axe`).toEqual([]);
    }
  }));
}
export async function instrument(page: Page) {
  await page.addInitScript(() => {
    const metrics = { listenerAddCalls: 0, listenerRemoveCalls: 0, layoutShift: 0, pageShows: 0, pageHides: 0 };
    (window as unknown as {glassMetrics: typeof metrics}).glassMetrics = metrics;
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(...args: Parameters<typeof add>) { metrics.listenerAddCalls++; return add.apply(this,args); };
    EventTarget.prototype.removeEventListener = function(...args: Parameters<typeof remove>) { metrics.listenerRemoveCalls++; return remove.apply(this,args); };
    window.addEventListener('pageshow', () => metrics.pageShows++); window.addEventListener('pagehide', () => metrics.pageHides++);
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) new PerformanceObserver(list => {
      for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.layoutShift += shift.value; }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

export async function setAppearance(page: Page, appearance: 'light' | 'dark') {
  await page.evaluate(value => { localStorage.setItem('leve.appearance',value); window.dispatchEvent(new StorageEvent('storage',{key:'leve.appearance',newValue:value})); },appearance);
  await expect(page.locator('html')).toHaveAttribute('data-appearance',appearance);
}
