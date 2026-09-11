import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-local',
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.LEVE_LOCAL_URL ?? 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
