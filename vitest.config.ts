import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
