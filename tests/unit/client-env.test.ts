import { afterEach, expect, it, vi } from 'vitest';
import config from '../../apps/web/vite.config';

afterEach(() => vi.unstubAllEnvs());
const configure = () => (config as (env: { command: string; mode: string }) => unknown)({ command: 'build', mode: 'production' });
it('rejects non-public API keys from the frontend environment', () => {
  vi.stubEnv('VITE_GEMINI_API_KEY', 'synthetic-env-guard-value');
  expect(configure).toThrow(/Variáveis sensíveis/);
});
it('preserves Firebase public API configuration', () => {
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'synthetic-public-config');
  expect(configure).not.toThrow();
});
