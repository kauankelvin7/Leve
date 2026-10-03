import { measureColor } from './color.mjs';

// Only resolves Axe's incomplete contrast checks; never replaces Axe violations.
// Rectangle sampling is conservative: even non-glyph background pixels must pass.
export async function measureIncompleteContrast(page, target) {
  const unknown = reason => ({ status: 'UNMEASURED', reason });
  if (target.length !== 1 || typeof target[0] !== 'string') return unknown('UNSUPPORTED_TARGET');
  const locator = page.locator(target[0]);
  if (await locator.count() !== 1) return unknown('AMBIGUOUS_TARGET');
  const element = await locator.elementHandle();
  if (!element) return unknown('MISSING_TARGET');
  const key = `__glassContrast_${Math.random().toString(36).slice(2)}`;
  await page.evaluate(key => {
    window[key] = { x: scrollX, y: scrollY, containers: [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight || e.scrollWidth > e.clientWidth).map(e => [e, e.scrollLeft, e.scrollTop]) };
  }, key);
  try {
    await locator.scrollIntoViewIfNeeded();
    const metadata = await element.evaluate(root => {
      const runs = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const forcedColors = matchMedia('(forced-colors: active)').matches;
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const parent = node.parentElement, style = getComputedStyle(parent);
        if (style.visibility !== 'visible' || style.display === 'none') continue;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor);
          const transform = s.transform === 'none' ? null : new DOMMatrixReadOnly(s.transform);
          if (Number(s.opacity) !== 1 || s.filter !== 'none' || s.mixBlendMode !== 'normal' || (transform && (!transform.is2D || transform.a !== 1 || transform.b !== 0 || transform.c !== 0 || transform.d !== 1)) || s.getPropertyValue('background-clip') === 'text' || s.getPropertyValue('-webkit-background-clip') === 'text') return { reason: 'UNSUPPORTED_COMPOSITING' };
        }
        if (!(parent instanceof HTMLElement) || parseFloat(style.getPropertyValue('-webkit-text-stroke-width')) > 0) return { reason: 'UNSUPPORTED_TEXT_EFFECT' };
        const range = document.createRange(); range.selectNodeContents(node);
        const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
        if (!rects.length) continue;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
          const left = bounds.x + ancestor.clientLeft, top = bounds.y + ancestor.clientTop;
          for (const rect of rects) {
            if (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX) && (rect.x < left || rect.x + rect.width > left + ancestor.clientWidth)) return { reason: 'CSS_CLIPPED_TEXT' };
            if (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowY) && (rect.y < top || rect.y + rect.height > top + ancestor.clientHeight)) return { reason: 'CSS_CLIPPED_TEXT' };
          }
        }
        const size = parseFloat(style.fontSize), weight = Number(style.fontWeight);
        if (!Number.isFinite(size) || !Number.isFinite(weight)) return { reason: 'UNKNOWN_FONT' };
        runs.push({ color: forcedColors && style.forcedColorAdjust !== 'none' ? style.color : style.getPropertyValue('-webkit-text-fill-color') || style.color, threshold: size >= 24 || (size >= 18.6666666667 && weight >= 700) ? 3 : 4.5, rects });
      }
      if (!runs.length) return { reason: 'NO_TEXT_RECTS' };
      // Generated text is not represented by the text walker, so cannot be certified.
      for (const item of [root, ...root.querySelectorAll('*')]) for (const pseudo of ['::before', '::after']) {
        const s = getComputedStyle(item, pseudo);
        if (s.content && !['none', 'normal', '""', "''"].includes(s.content) && s.display !== 'none') return { reason: 'GENERATED_CONTENT' };
      }
      const r = root.getBoundingClientRect();
      const rects = [r, ...runs.flatMap(run => run.rects)];
      const left = Math.floor(Math.min(...rects.map(rect => rect.x)) + scrollX), top = Math.floor(Math.min(...rects.map(rect => rect.y)) + scrollY);
      const right = Math.ceil(Math.max(...rects.map(rect => rect.x + rect.width)) + scrollX), bottom = Math.ceil(Math.max(...rects.map(rect => rect.y + rect.height)) + scrollY);
      if (left < 0 || top < 0 || right > document.documentElement.scrollWidth || bottom > document.documentElement.scrollHeight) return { reason: 'DOCUMENT_CLIPPED_TEXT' };
      if (left - scrollX < 0 || top - scrollY < 0 || right - scrollX > innerWidth || bottom - scrollY > innerHeight) return { reason: 'VIEWPORT_CLIPPED_TEXT' };
      return { runs, forcedColors, rootBox: { x: r.x, y: r.y, width: r.width, height: r.height }, clip: { x: left, y: top, width: right - left, height: bottom - top }, box: { x: left - scrollX, y: top - scrollY, width: right - left, height: bottom - top } };
    });
    if (metadata.reason) return unknown(metadata.reason);
    for (const run of metadata.runs) run.rgba = (await page.evaluate(measureColor, run.color)).rgba;
    const hidingFailure = await element.evaluate((root, { key, forcedColors }) => {
      root[key] = [root, ...root.querySelectorAll('*')].map(item => [item, item.getAttribute('style')]);
      if (forcedColors) {
        // Forced-color UA painting ignores transparent text-fill. Opacity on a
        // text-only inline wrapper hides the paint while retaining backgrounds.
        // Reject any selector or geometry change caused by the temporary nodes.
        // :has() can affect ancestors, siblings, and decorative pseudo paint,
        // so validate the original document, not only the target subtree.
        const originalElements = [...document.querySelectorAll('*')];
        const styles = item => {
          return [null, '::before', '::after'].map(pseudo => {
            const s = getComputedStyle(item, pseudo);
            return [...s].map(property => `${property}:${s.getPropertyValue(property)}`).join(';');
          }).join('|');
        };
        const originalStyles = originalElements.map(styles);
        const rects = node => {
          const range = document.createRange(); range.selectNodeContents(node);
          return [...range.getClientRects()].map(r => [r.x, r.y, r.width, r.height]);
        };
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
        let node;
        while ((node = walker.nextNode())) if (node.textContent.trim()) nodes.push(node);
        const originalRects = nodes.map(rects);
        root[`${key}Wrappers`] = [];
        for (const text of nodes) {
          const wrapper = document.createElement('span');
          wrapper.style.cssText = 'all:unset!important;display:inline!important;opacity:0!important';
          text.replaceWith(wrapper); wrapper.append(text);
          root[`${key}Wrappers`].push([text, wrapper]);
        }
        if (originalElements.some((item, index) => styles(item) !== originalStyles[index])) return 'FORCED_WRAPPER_STYLE_CHANGED';
        if (nodes.some((text, index) => {
          const current = rects(text), original = originalRects[index];
          return current.length !== original.length || current.some((r, i) => r.some((value, axis) => Math.abs(value - original[i][axis]) > .1));
        })) return 'FORCED_WRAPPER_LAYOUT_CHANGED';
        return null;
      }
      for (const [item] of root[key]) {
        item.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        // Ignore any improvement a text shadow provides; certify the fill alone.
        item.style.setProperty('text-shadow', 'none', 'important');
      }
      return null;
    }, { key, forcedColors: metadata.forcedColors });
    if (hidingFailure) return unknown(hidingFailure);
    // Native glyph rectangles can extend beyond a tight CSS line-height box.
    // Capture their union rather than silently cropping to the element border.
    // Playwright's viewport screenshot clip is relative to the visible viewport.
    const png = await page.screenshot({ clip: metadata.box, animations: 'disabled', scale: 'css' });
    const box = await locator.boundingBox();
    if (!box || Object.keys(box).some(k => Math.abs(box[k] - metadata.rootBox[k]) > 0.1)) return unknown('LAYOUT_CHANGED');
    return await page.evaluate(async ({ png, runs, box }) => {
      const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      if (!context) return { status: 'UNMEASURED', reason: 'NO_CANVAS' };
      context.drawImage(bitmap, 0, 0); bitmap.close();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: 'srgb' }).data;
      const luminance = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      let minimumRatio = Infinity, requiredRatio = 0, samples = 0, failed = false;
      for (const run of runs) for (const rect of run.rects) {
        const left = Math.floor(rect.x - box.x), top = Math.floor(rect.y - box.y), right = Math.ceil(rect.x + rect.width - box.x), bottom = Math.ceil(rect.y + rect.height - box.y);
        if (left < -1 || top < -1 || right > canvas.width + 1 || bottom > canvas.height + 1) return { status: 'UNMEASURED', reason: 'CLIPPED_TEXT' };
        for (let y = Math.max(0, top); y < Math.min(canvas.height, bottom); y++) for (let x = Math.max(0, left); x < Math.min(canvas.width, right); x++) {
          const index = (y * canvas.width + x) * 4;
          if (pixels[index + 3] !== 255) return { status: 'UNMEASURED', reason: 'TRANSPARENT_BACKGROUND' };
          const background = [...pixels.slice(index, index + 3)];
          // Native RGBA8 conversion rounds channels. Certify the worst ratio in
          // the rounding intervals, including color alpha, rather than accepting
          // an apparent threshold pass caused by an 8-bit rounding boundary.
          const interval = value => [Math.max(0, value - .5), Math.min(255, value + .5)];
          const bgLow = background.map(v => interval(v)[0]), bgHigh = background.map(v => interval(v)[1]);
          const alpha = run.rgba[3] === 255 ? [1, 1] : interval(run.rgba[3]).map(v => v / 255);
          const bounds = background.map((_, i) => {
            const color = interval(run.rgba[i]), values = [];
            for (const bg of [bgLow[i], bgHigh[i]]) for (const fg of color) for (const a of alpha) values.push(fg * a + bg * (1 - a));
            return [Math.min(...values), Math.max(...values)];
          });
          const fgLow = luminance(bounds.map(v => v[0])), fgHigh = luminance(bounds.map(v => v[1]));
          const backgroundLow = luminance(bgLow), backgroundHigh = luminance(bgHigh);
          const ratio = fgLow > backgroundHigh ? (fgLow + .05) / (backgroundHigh + .05) : backgroundLow > fgHigh ? (backgroundLow + .05) / (fgHigh + .05) : 1;
          minimumRatio = Math.min(minimumRatio, ratio); requiredRatio = Math.max(requiredRatio, run.threshold); samples++;
          if (ratio < run.threshold) failed = true;
        }
      }
      if (!samples) return { status: 'UNMEASURED', reason: 'NO_SAMPLES' };
      return { status: failed ? 'FAIL' : 'PASS', minimumRatio, requiredRatio, samples };
    }, { png: png.toString('base64'), runs: metadata.runs, box: metadata.box });
  } catch {
    return unknown('MEASUREMENT_FAILED');
  } finally {
    await element.evaluate((root, key) => {
      for (const [text, wrapper] of root[`${key}Wrappers`] ?? []) wrapper.replaceWith(text);
      delete root[`${key}Wrappers`];
      for (const [item, style] of root[key] ?? []) { if (style === null) item.removeAttribute('style'); else item.setAttribute('style', style); }
      delete root[key];
    }, key);
    await page.evaluate(key => {
      const scroll = window[key];
      for (const [element, x, y] of scroll.containers) element.scrollTo({ left: x, top: y, behavior: 'instant' });
      window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
      delete window[key];
    }, key);
    await element.dispose();
  }
}
