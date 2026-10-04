import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('permits Firebase Auth in production and isolated Preview without broadening frame origins', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const headers: { key: string; value: string }[] = config.headers.flatMap((entry: { headers: { key: string; value: string }[] }) => entry.headers);
  const policies = headers.filter(header => header.key === 'Content-Security-Policy');
  expect(policies).toHaveLength(1);
  const directives = new Map(policies[0]!.value.split(';').map(directive => {
    const [name, ...sources] = directive.trim().split(/\s+/);
    return [name, sources];
  }));
  expect(directives.get('frame-src')?.sort()).toEqual([
    'https://accounts.google.com',
    'https://leve-db.firebaseapp.com',
    'https://leve-preview.firebaseapp.com',
  ]);
  for (const domain of ['leve-db.firebaseapp.com', 'leve-preview.firebaseapp.com']) {
    expect(directives.get('connect-src')).toContain(`https://${domain}`);
  }
  expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
  expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
});
