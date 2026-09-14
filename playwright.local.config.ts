import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-local',
  globalSetup: './tests/e2e-local/setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.LEVE_LOCAL_URL ?? 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.LEVE_LOCAL_URL ? undefined : {
    env: { LEVE_EPHEMERAL: 'true' },
    command: 'node scripts/dev-local.mjs',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 },
  },
});
