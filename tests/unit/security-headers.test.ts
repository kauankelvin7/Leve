import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('security headers configured at the Vercel edge', () => {
  it('applies transport, framing, MIME, referrer, permissions, and CSP policies site-wide', async () => {
    const config = JSON.parse(await readFile('vercel.json', 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const global = config.headers.find(rule => rule.source === '/(.*)');
    expect(global).toBeDefined();
    const headers = Object.fromEntries(global!.headers.map(({ key, value }) => [key.toLowerCase(), value]));
    expect(headers['strict-transport-security']).toBe('max-age=31536000');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('microphone=(self)');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});
