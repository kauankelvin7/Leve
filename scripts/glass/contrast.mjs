import { measureColor } from './color.mjs';

// Only resolves Axe's incomplete contrast checks; never replaces Axe violations.
// Native black/white paint differences identify glyph pixels independently of
// the original contrast; a foreground matching its background still fails.
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
    await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    // Scroll triggers the real launcher's ResizeObserver/rAF positioning. Read
    // after those layout notifications and finite transitions, not mid-update.
    await page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
    });
    await page.evaluate(async key => {
      window[key].animations = document.getAnimations().filter(animation => animation.playState === 'running').map(animation => { animation.pause(); return animation; });
      await Promise.all(window[key].animations.map(animation => animation.ready));
    }, key);
    const metadata = await element.evaluate((root, key) => {
      root[`${key}Text`] = { text: root.textContent, value: 'value' in root ? root.value : undefined, placeholder: 'placeholder' in root ? root.placeholder : undefined };
      const runs = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const forcedColors = matchMedia('(forced-colors: active)').matches;
      const field = root instanceof HTMLTextAreaElement || (root instanceof HTMLInputElement && ['text', 'email', 'search', 'password', 'tel', 'url'].includes(root.type));
      const placeholder = field && !root.value && root.placeholder;
      let node;
      while ((node = field ? (node ? null : root) : walker.nextNode())) {
        if (field && !root.value && !placeholder) return { reason: 'EMPTY_TEXT_CONTROL' };
        if (!field && !node.textContent.trim()) continue;
        const parent = field ? root : node.parentElement, style = getComputedStyle(parent, placeholder ? '::placeholder' : null);
        let opacity = placeholder ? Number(style.opacity) : 1;
        if (style.visibility !== 'visible' || style.display === 'none') continue;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor);
          const transform = s.transform === 'none' ? null : new DOMMatrixReadOnly(s.transform);
          if (Number(s.opacity) !== 1) {
            const textOnly = ancestor === parent && !field && !parent.children.length && s.backgroundColor === 'rgba(0, 0, 0, 0)' && s.backgroundImage === 'none' && s.boxShadow === 'none' && s.textDecorationLine === 'none' && ['Top', 'Right', 'Bottom', 'Left'].every(side => parseFloat(s[`border${side}Width`]) === 0) && ['::before', '::after'].every(pseudo => ['none', 'normal'].includes(getComputedStyle(parent, pseudo).content));
            if (!textOnly) return { reason: 'UNSUPPORTED_COMPOSITING' };
            opacity *= Number(s.opacity);
          }
          if (s.filter !== 'none' || s.mixBlendMode !== 'normal' || (transform && (!transform.is2D || transform.a !== 1 || transform.b !== 0 || transform.c !== 0 || transform.d !== 1)) || s.getPropertyValue('background-clip') === 'text' || s.getPropertyValue('-webkit-background-clip') === 'text') return { reason: 'UNSUPPORTED_COMPOSITING' };
        }
        if (!(parent instanceof HTMLElement) || parseFloat(style.getPropertyValue('-webkit-text-stroke-width')) > 0) return { reason: 'UNSUPPORTED_TEXT_EFFECT' };
        const range = document.createRange(); if (!field) range.selectNodeContents(node);
        let rects = (field ? [root.getBoundingClientRect()] : [...range.getClientRects()]).filter(r => r.width > 0 && r.height > 0).map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
        if (!rects.length) continue;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          const s = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
          const left = bounds.x + ancestor.clientLeft, top = bounds.y + ancestor.clientTop;
          rects = rects.map(rect => {
            const clipX = ['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX), clipY = ['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowY);
            const x = clipX ? Math.max(rect.x, left) : rect.x, y = clipY ? Math.max(rect.y, top) : rect.y;
            const right = clipX ? Math.min(rect.x + rect.width, left + ancestor.clientWidth) : rect.x + rect.width, bottom = clipY ? Math.min(rect.y + rect.height, top + ancestor.clientHeight) : rect.y + rect.height;
            return { x, y, width: right - x, height: bottom - y };
          }).filter(rect => rect.width > 0 && rect.height > 0);
        }
        const size = parseFloat(style.fontSize), weight = Number(style.fontWeight);
        if (!Number.isFinite(size) || !Number.isFinite(weight)) return { reason: 'UNKNOWN_FONT' };
        if (!rects.length) return { reason: 'NO_VISIBLE_TEXT_RECTS' };
        runs.push({ color: placeholder || (forcedColors && style.forcedColorAdjust !== 'none') ? style.color : style.getPropertyValue('-webkit-text-fill-color') || style.color, opacity, threshold: size >= 24 || (size >= 18.6666666667 && weight >= 700) ? 3 : 4.5, rects });
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
      if (field && forcedColors) return { reason: 'FORCED_TEXT_CONTROL' };
      return { runs, forcedColors, rootBox: { x: r.x, y: r.y, width: r.width, height: r.height }, clip: { x: left, y: top, width: right - left, height: bottom - top }, box: { x: left - scrollX, y: top - scrollY, width: right - left, height: bottom - top } };
    }, key);
    if (metadata.reason) return unknown(metadata.reason);
    for (const run of metadata.runs) run.rgba = (await page.evaluate(measureColor, run.color)).rgba;
    const hidingFailure = await element.evaluate((root, { key, forcedColors }) => {
      root[key] = [root, ...root.querySelectorAll('*')].map(item => [item, item.getAttribute('style')]);
      // Geometry is checked for every original element. Full computed-style
      // snapshots are needed where paint intersects the measured clip, not for
      // thousands of unrelated offscreen properties. Outside paint still guards
      // shadows, compositing, visibility and backgrounds; generated pseudos keep
      // full snapshots because their paint can extend beyond the owner box.
      const clip = root.getBoundingClientRect();
      const outsidePaint = ['display', 'visibility', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode', 'transform', 'translate', 'rotate', 'scale', 'z-index', 'position', 'box-shadow', 'background-color', 'background-image', 'color', 'clip-path', 'overflow-x', 'overflow-y', 'font', 'line-height', 'letter-spacing', 'word-spacing', 'text-decoration', 'text-shadow', 'text-transform', 'text-align', 'writing-mode', 'direction', '-webkit-text-fill-color', 'caret-color'];
      const serialize = item => {
        const rect = item.getBoundingClientRect();
        const intersects = rect.right >= clip.left && rect.left <= clip.right && rect.bottom >= clip.top && rect.top <= clip.bottom;
        return JSON.stringify([rect.x, rect.y, rect.width, rect.height]) + [null, '::before', '::after', ...(item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement ? ['::placeholder'] : [])].map(pseudo => {
          const style = getComputedStyle(item, pseudo);
          if (pseudo && ['none', 'normal'].includes(style.content) && pseudo !== '::placeholder') return `${pseudo}:${style.content}`;
          const properties = intersects || pseudo ? [...style] : outsidePaint;
          return properties.filter(property => !root.contains(item) || !['-webkit-text-fill-color', 'text-shadow', 'caret-color'].includes(property)).map(property => `${property}:${style.getPropertyValue(property)}`).join(';');
        }).join('|');
      };
      const guards = [...document.querySelectorAll('*')].map(item => [item, serialize(item)]);
      const originalText = root[`${key}Text`];
      root[`${key}Check`] = () => root.textContent === originalText.text && (!('value' in root) || root.value === originalText.value) && (!('placeholder' in root) || root.placeholder === originalText.placeholder) && guards.every(([item, styles]) => { const current = serialize(item); if (current === styles) return true; root[`${key}Changed`] = item.tagName.toLowerCase() + '.' + [...item.classList].join('.'); return false; });
      if (forcedColors) {
        // Forced-color UA painting ignores transparent text-fill. Opacity on a
        // text-only inline wrapper hides the paint while retaining backgrounds.
        // Reject any selector or geometry change caused by the temporary nodes.
        // :has() can affect ancestors, siblings, and decorative pseudo paint,
        // so validate the original document, not only the target subtree.
        const originalElements = [...document.querySelectorAll('*')];
        const styles = serialize;
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
        item.style.setProperty('caret-color', 'transparent', 'important');
      }
      return null;
    }, { key, forcedColors: metadata.forcedColors });
    if (hidingFailure) return unknown(hidingFailure);
    if (!await element.evaluate((root, key) => root[`${key}Check`](), key)) return unknown('PAINT_STYLE_CHANGED:' + await element.evaluate((root, key) => root[`${key}Changed`] ?? 'target-content', key));
    // Native glyph rectangles can extend beyond a tight CSS line-height box.
    // Capture their union rather than silently cropping to the element border.
    // Playwright's viewport screenshot clip is relative to the visible viewport.
    const png = await page.screenshot({ clip: metadata.box, animations: 'allow', scale: 'css' });
    if (!await element.evaluate((root, key) => root[`${key}Check`](), key)) return unknown('PAINT_CONTENT_OR_STYLE_CHANGED');
    const paints = [];
    for (const color of ['rgb(0, 0, 0)', 'rgb(255, 255, 255)']) {
      await element.evaluate((root, { key, color, forcedColors }) => {
        if (forcedColors) for (const [, wrapper] of root[`${key}Wrappers`]) {
          wrapper.style.setProperty('forced-color-adjust', 'none', 'important');
          wrapper.style.setProperty('-webkit-text-fill-color', color, 'important');
          wrapper.style.setProperty('color', color, 'important');
          wrapper.style.setProperty('opacity', '1', 'important');
        }
        else for (const [item] of root[key]) item.style.setProperty('-webkit-text-fill-color', color, 'important');
      }, { key, color, forcedColors: metadata.forcedColors });
      if (!await element.evaluate((root, key) => root[`${key}Check`](), key)) return unknown('PAINT_STYLE_CHANGED:' + await element.evaluate((root, key) => root[`${key}Changed`] ?? 'target-content', key));
      paints.push((await page.screenshot({ clip: metadata.box, animations: 'allow', scale: 'css' })).toString('base64'));
      if (!await element.evaluate((root, key) => root[`${key}Check`](), key)) return unknown('PAINT_CONTENT_OR_STYLE_CHANGED');
    }
    const box = await locator.boundingBox();
    if (!box || Object.keys(box).some(k => Math.abs(box[k] - metadata.rootBox[k]) > 0.1)) return unknown('LAYOUT_CHANGED');
    return await page.evaluate(async ({ png, paints, runs, box }) => {
      const decode = async value => {
        const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
        if (!context) throw Error('NO_CANVAS');
        context.drawImage(bitmap, 0, 0); bitmap.close();
        return { pixels: context.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: 'srgb' }).data, width: canvas.width, height: canvas.height };
      };
      const backgroundImage = await decode(png), black = await decode(paints[0]), white = await decode(paints[1]);
      if ([black, white].some(paint => paint.width !== backgroundImage.width || paint.height !== backgroundImage.height)) return { status: 'UNMEASURED', reason: 'MASK_SIZE_CHANGED' };
      const { pixels, width, height } = backgroundImage;
      const luminance = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      let minimumRatio = Infinity, requiredRatio = 0, samples = 0, failed = false;
      for (const run of runs) for (const rect of run.rects) {
        const left = Math.floor(rect.x - box.x), top = Math.floor(rect.y - box.y), right = Math.ceil(rect.x + rect.width - box.x), bottom = Math.ceil(rect.y + rect.height - box.y);
        if (left < -1 || top < -1 || right > width + 1 || bottom > height + 1) return { status: 'UNMEASURED', reason: 'CLIPPED_TEXT' };
        let runSamples = 0;
        for (let y = Math.max(0, top); y < Math.min(height, bottom); y++) for (let x = Math.max(0, left); x < Math.min(width, right); x++) {
          const index = (y * width + x) * 4;
          if (![0, 1, 2].some(channel => black.pixels[index + channel] !== white.pixels[index + channel])) continue;
          if (pixels[index + 3] !== 255) return { status: 'UNMEASURED', reason: 'TRANSPARENT_BACKGROUND' };
          const background = [...pixels.slice(index, index + 3)];
          // Native RGBA8 conversion rounds channels. Certify the worst ratio in
          // the rounding intervals, including color alpha, rather than accepting
          // an apparent threshold pass caused by an 8-bit rounding boundary.
          const interval = value => [Math.max(0, value - .5), Math.min(255, value + .5)];
          const bgLow = background.map(v => interval(v)[0]), bgHigh = background.map(v => interval(v)[1]);
          const alpha = (run.rgba[3] === 255 ? [1, 1] : interval(run.rgba[3]).map(v => v / 255)).map(v => v * run.opacity);
          const bounds = background.map((_, i) => {
            const color = interval(run.rgba[i]), values = [];
            for (const bg of [bgLow[i], bgHigh[i]]) for (const fg of color) for (const a of alpha) values.push(fg * a + bg * (1 - a));
            return [Math.min(...values), Math.max(...values)];
          });
          const fgLow = luminance(bounds.map(v => v[0])), fgHigh = luminance(bounds.map(v => v[1]));
          const backgroundLow = luminance(bgLow), backgroundHigh = luminance(bgHigh);
          const ratio = fgLow > backgroundHigh ? (fgLow + .05) / (backgroundHigh + .05) : backgroundLow > fgHigh ? (backgroundLow + .05) / (fgHigh + .05) : 1;
          minimumRatio = Math.min(minimumRatio, ratio); requiredRatio = Math.max(requiredRatio, run.threshold); samples++; runSamples++;
          if (ratio < run.threshold) failed = true;
        }
        if (!runSamples) return { status: 'UNMEASURED', reason: 'NO_GLYPH_SAMPLES' };
      }
      if (!samples) return { status: 'UNMEASURED', reason: 'NO_SAMPLES' };
      return { status: failed ? 'FAIL' : 'PASS', minimumRatio, requiredRatio, samples };
    }, { png: png.toString('base64'), paints, runs: metadata.runs, box: metadata.box });
  } catch {
    return unknown('MEASUREMENT_FAILED');
  } finally {
    await element.evaluate((root, key) => {
      for (const [text, wrapper] of root[`${key}Wrappers`] ?? []) wrapper.replaceWith(text);
      delete root[`${key}Wrappers`];
      delete root[`${key}Check`];
      delete root[`${key}Changed`];
      delete root[`${key}Text`];
      for (const [item, style] of root[key] ?? []) { if (style === null) item.removeAttribute('style'); else item.setAttribute('style', style); }
      delete root[key];
    }, key);
    await page.evaluate(key => {
      const scroll = window[key];
      for (const [element, x, y] of scroll.containers) element.scrollTo({ left: x, top: y, behavior: 'instant' });
      window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
      for (const animation of scroll.animations ?? []) if (animation.playState === 'paused') animation.play();
      delete window[key];
    }, key);
    await element.dispose();
  }
}
