import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
process.env.SCHEDULER_HMAC_SECRET = randomBytes(32).toString('hex');
const phase = process.env.GLASS_PHASE === 'before' ? 'before' : 'after';
export default defineConfig({
  testDir: './scripts/glass', testMatch: '**/*.spec.ts', globalSetup: './tests/e2e-local/setup.ts',
  timeout: 60_000, expect: { timeout: 10_000 }, workers: 1, retries: 0,
  outputDir: `.cache/glass/${phase}/traces`,
  reporter: [['list'], ['json', { outputFile: `.cache/glass/${phase}/playwright.json` }]],
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'public-preview', testMatch: 'public.spec.ts', use: { baseURL: 'http://localhost:4173' } },
    { name: 'authenticated-local', testMatch: 'authenticated.spec.ts', use: { baseURL: 'http://localhost:5174' } },
  ],
  webServer: [
    { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: false, gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 } },
    { command: 'node scripts/glass/ports.mjs && node scripts/dev-local.mjs', url: 'http://localhost:5174', reuseExistingServer: false, gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 }, env: { LEVE_EPHEMERAL: 'true', GEMINI_API_KEY: '', SCHEDULER_HMAC_SECRET: process.env.SCHEDULER_HMAC_SECRET } },
  ],
});
