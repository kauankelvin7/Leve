import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it.each([
  '/api/health', '/api/version', '/api/session', '/api/commands',
  '/api/gika/respond', '/api/gika/recover-confirmation',
  '/api/gika/recover-batch', '/api/gika/choose-recurrence',
  '/api/commands/synthetic-operation', '/api/account/export', '/api/internal/tick',
])('routes %s to a concrete API function instead of a single-segment dynamic route', path => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    rewrites: { source: string; destination: string }[];
  };
  const rewrite = config.rewrites.filter(rule => rule.source.startsWith('/api/'))
    .find(rule => new URLPattern({ pathname: rule.source }).test(`https://preview.example${path}`));
  expect(rewrite, path).toBeDefined();
  const entry = `.${rewrite!.destination}/index.ts`;
  expect(existsSync(entry), entry).toBe(true);
  expect(readFileSync(entry, 'utf8')).toContain('export default app;');
});
