import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const baseURL = process.env.SCREENSHOTS_URL ?? 'http://127.0.0.1:4173';
const output = 'docs/screenshots';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(`${baseURL}/entrar`, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const [index, route] of ['/demo/hoje', '/demo/notas', '/demo/compras'].entries()) {
    await mobile.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await mobile.screenshot({ path: `${output}/mobile-${index + 1}.png`, fullPage: true });
  }
} finally { await browser.close(); }
