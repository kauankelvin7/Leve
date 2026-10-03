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
  assert.equal((await fixture('color:white;background:white')).status, 'FAIL');
  await page.setContent('<style>body{background:white}#target{font:16px Arial;color:black;opacity:.82;margin:30px}</style><p id="target">Synthetic text only opacity</p>');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.locator('#target').evaluate(e => { e.style.opacity = '.1'; });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'FAIL');
  await page.setContent('<style>body{background:white}#target{position:relative;font:24px Arial;white-space:pre;color:black;width:180px;margin:30px}</style><div id="target">I          I<svg style="position:absolute;left:30px;top:0;width:20px;height:20px"><rect width="20" height="20" fill="black"/></svg></div>');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.setContent('<style>body{background:white}#target{display:block;font:16px Arial;margin:30px;color:black;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100px}</style><strong id="target">Synthetic long text truncates with native ellipsis</strong>');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.setContent('<style>body{background:white}#target{font:16px Arial;width:250px;height:50px;background:white;color:black}#target::placeholder{color:#111;opacity:.82}</style><textarea id="target" placeholder="Synthetic placeholder"></textarea>');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.locator('#target').fill('Synthetic input value');
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.locator('#target').evaluate(e => { e.style.color = 'white'; });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'FAIL');
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
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'PASS');
  await page.locator('#target').evaluate(e => { e.style.height = '0px'; });
  assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'UNMEASURED');
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
  await page.emulateMedia({ forcedColors: 'none' });
  // Offscreen owners can still paint shadows/generated overlays into the clip.
  for (const declaration of ['box-shadow:0 -1000px 0 200px white', '--overlay:1']) {
    await page.setContent('<style>body{background:white}#target{color:black}#distant{margin-top:1000px}#distant::before{content:"";position:fixed;inset:0;background:white;opacity:var(--overlay,0);pointer-events:none}</style><p id="target">Synthetic guarded text</p><div id="distant">Synthetic distant paint</div>');
    const originalScreenshot = page.screenshot.bind(page);
    page.screenshot = async options => {
      const png = await originalScreenshot(options);
      await page.locator('#distant').evaluate((element, css) => { element.style.cssText = css; }, declaration);
      return png;
    };
    try { assert.equal((await measureIncompleteContrast(page, ['#target'])).status, 'UNMEASURED'); }
    finally { page.screenshot = originalScreenshot; }
  }
  await page.setContent('<style>body{background:white}#target{margin:30px;color:black}</style><p id="target">Synthetic timer 00:00</p>');
  const screenshot = page.screenshot.bind(page);
  page.screenshot = async options => {
    const png = await screenshot(options);
    await page.locator('#target').evaluate(e => { e.textContent = 'Synthetic timer 00:01'; });
    return png;
  };
  try {
    assert.deepEqual(await measureIncompleteContrast(page, ['#target']), { status: 'UNMEASURED', reason: 'PAINT_CONTENT_OR_STYLE_CHANGED' });
  } finally {
    page.screenshot = screenshot;
  }
  console.log('PASS native contrast: glyph mask, equal colors, neighboring SVG, ellipsis, text-only opacity, textarea/placeholder, forced colors, rounding/fonts, restoration and changing-text rejection');
} finally {
  await browser.close();
}
