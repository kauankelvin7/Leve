import { defineConfig } from 'vitest/config';

process.env.FIREBASE_PROJECT_ID = 'demo-leve';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
