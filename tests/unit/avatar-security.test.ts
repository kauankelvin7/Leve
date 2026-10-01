import { expect, test } from 'vitest';
import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';

const options = { size: 128, radius: 22, backgroundColor: ['dfe9df', 'f3dfd4', 'e4deef', 'dce8f2'] };
test('avatar renderer preserves deterministic SVG data URI and distinct profile seeds', () => {
  const first = createAvatar(avataaars, { ...options, seed: 'leve-aurora' });
  expect(first.toDataUri()).toMatch(/^data:image\/svg\+xml;/);
  expect(first.toString()).toContain('<svg');
  expect(first.toDataUri()).toBe(createAvatar(avataaars, { ...options, seed: 'leve-aurora' }).toDataUri());
  expect(first.toDataUri()).not.toBe(createAvatar(avataaars, { ...options, seed: 'leve-bento' }).toDataUri());
});
test('GHSA-gcr2-9v8m-gq45: malicious rotate cannot inject an SVG script element', () => {
  // Probe serialization, without running script. Runtime callers can bypass static TS types.
  const rotate = '0)\"><script>probe()</script><g transform="rotate(0' as unknown as number;
  expect(createAvatar(avataaars, { ...options, seed: 'leve-security-fixture', rotate }).toString()).not.toContain('<script>probe()</script>');
});
