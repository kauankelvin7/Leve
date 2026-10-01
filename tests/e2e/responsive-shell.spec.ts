import { expect, test } from '@playwright/test';

const matrix = [
  { name: 'mobile', width: 390, height: 844, mode: 'mobile' },
  { name: 'tablet portrait', width: 853, height: 1280, mode: 'rail' },
  { name: 'notebook', width: 1024, height: 768, mode: 'desktop' },
  { name: 'desktop', width: 1366, height: 768, mode: 'desktop' },
  { name: 'wide desktop', width: 1920, height: 1080, mode: 'wide' },
  { name: 'ultrawide', width: 2560, height: 1440, mode: 'ultrawide' },
] as const;

for (const viewport of matrix) {
  test(`shell responsivo — ${viewport.name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/demo/hoje');
    await expect(page.getByRole('heading', { name: 'Meu dia', exact: true })).toBeVisible();

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>('.app-shell')!;
      const sidebar = document.querySelector<HTMLElement>('.sidebar')!;
      const main = document.querySelector<HTMLElement>('.main-wrapper')!;
      const shellRect = shell.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        shellLeft: shellRect.left,
        shellRight: shellRect.right,
        shellWidth: shellRect.width,
        sidebarWidth: sidebarRect.width,
        sidebarHeight: sidebarRect.height,
        mainWidth: mainRect.width,
        navLabelsVisible: [...document.querySelectorAll<HTMLElement>('.sidebar .nav-label')]
          .some(element => getComputedStyle(element).display !== 'none'),
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport);

    if (viewport.mode === 'rail') {
      expect(metrics.sidebarWidth).toBeLessThanOrEqual(90);
      expect(metrics.mainWidth).toBeGreaterThan(viewport.width * .78);
      expect(metrics.navLabelsVisible).toBe(false);
    }

    if (viewport.mode === 'desktop') {
      expect(metrics.sidebarWidth).toBeGreaterThan(175);
      expect(metrics.mainWidth).toBeGreaterThan(viewport.width * .68);
    }

    if (viewport.mode === 'wide') {
      expect(metrics.shellWidth).toBeGreaterThan(1850);
      expect(metrics.mainWidth).toBeGreaterThan(1500);
    }

    if (viewport.mode === 'ultrawide') {
      expect(metrics.shellWidth).toBeGreaterThanOrEqual(2200);
      expect(metrics.shellWidth).toBeLessThanOrEqual(2241);
      expect(Math.abs(metrics.shellLeft - (viewport.width - metrics.shellWidth) / 2)).toBeLessThan(2);
      expect(metrics.mainWidth).toBeGreaterThan(1800);
    }
  });
}

test('rotas principais preservam reflow sem overflow em tablet e monitor grande', async ({ page }) => {
  for (const width of [853, 1920, 2560]) {
    await page.setViewportSize({ width, height: width === 853 ? 1280 : 1080 });
    for (const route of ['hoje', 'calendario', 'notas', 'compras']) {
      await page.goto(`/demo/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
