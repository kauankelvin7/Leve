import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
describe('native Node server adapter, credential-free smoke guard', () => {
  it('real smoke missing env exits BLOCKED=2 before network and imports strip-only TS', () => {
    try {
      execFileSync(process.execPath, ['scripts/gika-smoke.mjs'], { env: { ...process.env, GEMINI_API_KEY: '' }, encoding: 'utf8', stdio: 'pipe' });
      throw new Error('Smoke unexpectedly passed');
    } catch (error) {
      const failure = error as { status?: number; stderr?: string };
      expect(failure.status).toBe(2); expect(failure.stderr).toContain('BLOCKED: GEMINI_API_KEY ausente');
      expect(failure.stderr).not.toContain('ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
    }
  });
});
