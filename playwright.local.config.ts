import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

// Ephemeral test-only configuration, shared by the webServer and test workers; never written/logged.
if (!process.env.LEVE_LOCAL_URL) process.env.SCHEDULER_HMAC_SECRET ??= randomBytes(32).toString('hex');

export default defineConfig({
  testDir: './tests/e2e-local',
  globalSetup: './tests/e2e-local/setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.LEVE_LOCAL_URL ?? 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.LEVE_CHROMIUM_EXECUTABLE ? {
      launchOptions: { executablePath: process.env.LEVE_CHROMIUM_EXECUTABLE },
    } : {}),
  },
  webServer: process.env.LEVE_LOCAL_URL ? undefined : {
    env: { LEVE_EPHEMERAL: 'true', GEMINI_API_KEY: '', SCHEDULER_HMAC_SECRET: process.env.SCHEDULER_HMAC_SECRET! },
    command: 'node scripts/dev-local.mjs',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 },
  },
});
