// Authoring only. Sample native, transparent frames with the product Canvas runtime.
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require('@playwright/test');
const repo = path.resolve(__dirname, '../../../..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:5174/dev/gika-character');
    const poses = await page.evaluate(async root => {
      const modulePath = '/node_modules/.vite/deps/@rive-app_canvas.js';
      const module = await import(modulePath);
      const { Rive, RuntimeLoader, Layout, Fit, Alignment } = module.default ?? module;
      RuntimeLoader.setWasmUrl('/@fs' + root + '/node_modules/@rive-app/canvas/rive.wasm');
      RuntimeLoader.setWasmFallbackUrl(null);
      const result = {};
      for (const state of ['rest', 'idle', 'blink', 'listening', 'thinking', 'clarify', 'success', 'error', 'offline']) {
        const canvas = document.createElement('canvas');
        canvas.width = 135; canvas.height = 133;
        canvas.style.width = '135px'; canvas.style.height = '133px';
        document.body.append(canvas);
        let rive;
        try {
          await new Promise((loaded, failed) => {
            rive = new Rive({
              canvas, src: '/@fs' + root + '/assets/gika/rive/essential-bust/gika-essential-bust.riv',
              artboard: 'GikaEssential', animations: state, autoplay: false,
              shouldDisableRiveListeners: true,
              layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
              onLoad: loaded, onLoadError: failed,
            });
          });
          rive.play(state); await new Promise(requestAnimationFrame); rive.pause(state);
          // Authoring-only sampling with the installed 2.44 API; never used by the product.
          rive.scrub(state, (state === 'blink' ? 20 : 60) / 60);
          for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
          const pixels = canvas.getContext('2d').getImageData(0, 0, 135, 133).data;
          if (!pixels.some((value, i) => i % 4 === 3 && value > 0)) throw Error('Empty sampled pose');
          result[state] = canvas.toDataURL();
        } finally { rive?.cleanup(); canvas.remove(); }
      }
      return result;
    }, repo);
    const dir = path.join(__dirname, 'poses');
    fs.mkdirSync(dir, { recursive: true });
    for (const [state, data] of Object.entries(poses)) fs.writeFileSync(path.join(dir, state + '.png'), Buffer.from(data.split(',')[1], 'base64'));
    execFileSync('python', ['-c', "from PIL import Image;from pathlib import Path;import sys\nfor f in Path(sys.argv[1]).glob('*.png'):\n im=Image.open(f);im.save(f,optimize=True,compress_level=9)", dir]);
    console.log('9 native transparent poses sampled; no background or upscaling.');
  } finally { await browser.close(); }
})().catch(() => { console.error('Pose sampling failed.'); process.exitCode = 1; });
