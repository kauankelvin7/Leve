import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Rasterize the existing brand without fonts or external assets.
const source = await readFile(new URL('../apps/web/public/favicon.svg', import.meta.url), 'utf8');
const mark = source.replace(/<rect[^>]*\/>/, '').match(/<path[\s\S]*<\/svg>/)[0].replace('</svg>', '');
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">${mark.replaceAll('#192A1E', '#FFFFFF').replaceAll('#3B7856', '#FFFFFF')}</svg>`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="#BFD4C6"/><g transform="translate(24 24) scale(.75)">${mark}</g></svg>`;
const destination = new URL('../apps/web/public/icons/', import.meta.url);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ ...(process.env.LEVE_CHROMIUM_EXECUTABLE ? { executablePath: process.env.LEVE_CHROMIUM_EXECUTABLE } : {}) });
try {
  for (const [name, size, svg] of [
    ['icon-192.png', 192, source],
    ['icon-512.png', 512, source],
    ['icon-maskable-512.png', 512, maskable],
    ['apple-touch-180.png', 180, maskable],
    ['badge-96.png', 96, badge],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.screenshot({ path: new URL(name, destination).pathname, omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
