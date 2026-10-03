import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { measureIncompleteContrast } from './contrast.mjs';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 300 }, deviceScaleFactor: 2 });
  const fixture = async css => {
    await page.setContent(`<style>body{margin:0;background:white}#target{font:16px Arial;padding:10px;background:linear-gradient(90deg,#fff,#eee);${css}}</style><div id="target">Synthetic text <span>nested text</span></div>`);
    return measureIncompleteContrast(page, ['#target']);
  };
  assert.equal((await fixture('color:#111')).status, 'PASS');
  assert.equal((await fixture('color:#aaa')).status, 'FAIL');
  assert.equal((await fixture('color:rgb(0 0 0 / 20%)')).status, 'FAIL');
  assert.equal((await fixture('color:#888;font-size:24px')).status, 'PASS');
  assert.equal((await fixture('color:#888;font-size:23px')).status, 'FAIL');
  assert.equal((await fixture('color:#888;font-size:19px;font-weight:700')).status, 'PASS');
  assert.equal((await fixture('color:#888;font-size:19px;font-weight:600')).status, 'FAIL');
  assert.equal((await fixture('color:#111;opacity:.5')).status, 'UNMEASURED');
  assert.equal((await fixture('color:#111;text-shadow:1px 1px black')).status, 'PASS');
  assert.equal((await fixture('color:#aaa;text-shadow:1px 1px black')).status, 'FAIL');
  assert.equal((await fixture('color:#111;filter:blur(1px)')).status, 'UNMEASURED');
  assert.equal((await fixture('color:#111;transform:rotate(1deg)')).status, 'UNMEASURED');
  assert.equal((await fixture('color:#111;transform:translateY(10px)')).status, 'PASS');
  await page.setContent('<style>body{margin:0;background:white}#target{font:88px/60px Arial;margin:50px;color:black;background:linear-gradient(90deg,white,#eee)}</style><div id="target">Leve</div>');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.locator('#target').evaluate(e => { e.style.overflow = 'hidden'; e.style.height = '10px'; });
  assert.deepEqual(await measureIncompleteContrast(page, ['#target']), { status: 'UNMEASURED', reason: 'CSS_CLIPPED_TEXT' });
  assert.equal((await fixture('color:oklch(.2 0 0)')).status, 'PASS');
  assert.equal((await measureIncompleteContrast(page, ['#absent'])).status, 'UNMEASURED');
  assert.equal((await measureIncompleteContrast(page, [['iframe', '#target']])).status, 'UNMEASURED');
  await page.setContent('<style>body{margin:0;background:white}#target{margin-top:1000px;color:black;background:linear-gradient(90deg,#fff,#eee)}</style><div id="target" style="font-size:16px">Synthetic offscreen text<span style="color:#111"> nested</span></div>');
  const styles = await page.locator('#target, #target span').evaluateAll(items => items.map(e => e.getAttribute('style')));
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  assert.deepEqual(await page.locator('#target, #target span').evaluateAll(items => items.map(e => e.getAttribute('style'))), styles);
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.setContent('<style>body{background:white}#scroller{height:80px;overflow:auto}#target{margin-top:300px;background:linear-gradient(90deg,white,#eee);color:black}</style><div id="scroller"><div id="target">Synthetic clipped scroller text</div></div>');
  await measureIncompleteContrast(page, ['#target']);
  assert.equal(await page.locator('#scroller').evaluate(e => e.scrollTop), 0);
  // A thin low-contrast stripe must fail even though almost the whole gradient passes.
  assert.equal((await fixture('color:#111;background:linear-gradient(90deg,white 0%,white 45%,#111 46%,#111 47%,white 48%)')).status, 'FAIL');
  // Descendant font/color are evaluated independently of the target container.
  await fixture('color:#111;font-size:24px');
  await page.locator('span').evaluate(e => { e.style.fontSize = '16px'; e.style.color = '#aaa'; });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'FAIL');
  await page.addStyleTag({ content: '#target::before{content:"Synthetic generated text"}' });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'UNMEASURED');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setContent('<style>body{margin:0;background:white}#target{font:16px Arial;padding:20px;color:rgb(255 255 255 / 10%);background:linear-gradient(90deg,white,#eee)}</style><div id="target" style="line-height:20px">Synthetic forced text <span style="font-weight:700">nested</span></div>');
  const originalHtml = await page.locator('#target').evaluate(e => { window.originalTextNode = e.firstChild; return e.outerHTML; });
  const forced = await measureIncompleteContrast(page, ['#target']);
  assert.equal(forced.status, 'PASS');
  assert.ok(forced.minimumRatio > 20, 'certifies actual forced black/white rather than authored white alpha');
  assert.equal(await page.locator('#target').evaluate(e => e.outerHTML), originalHtml);
  assert.equal(await page.locator('#target').evaluate(e => e.firstChild === window.originalTextNode), true);
  await page.locator('#target').evaluate(e => { e.style.forcedColorAdjust = 'none'; e.style.color = 'rgb(0 0 0 / 20%)'; });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'FAIL');
  await page.setContent('<style>body{background:white}#target{padding:20px;color:black;background:white}#target:has(span){padding:40px}</style><div id="target">Synthetic selector guard</div>');
  assert.deepEqual(await measureIncompleteContrast(page, ['#target']), { status: 'UNMEASURED', reason: 'FORCED_WRAPPER_STYLE_CHANGED' });
  assert.equal(await page.locator('#target span').count(), 0);
  console.log('PASS native incomplete contrast: gradients, alpha, font thresholds, modern color, offscreen/restoration, unsupported targets/effects');
} finally {
  await browser.close();
}
