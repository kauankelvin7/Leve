import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { characterActivity, characterModes, characterState } from '../../apps/web/src/features/gika/character/controller';
const facts = { open: true, online: true, visible: true, reducedMotion: false, requestPending: false, voiceListening: false, activity: 'idle' as const };
it('exact nine-state visual surface; no celebration/gesture or model-controlled input', () => {
  expect(characterModes).toEqual({ rest: 0, idle: 1, blink: 2, listening: 3, thinking: 4, clarify: 5, success: 6, error: 7, offline: 8 });
});
it.each([{ open: false }, { visible: false }])('inactive presentation is static even with an ack %j', inactive => {
  expect(characterState({ ...facts, activity: 'success', ...inactive })).toBe('rest');
});
it('reduced motion retains the emotional state; rendering controls animation separately', () => {
  for (const activity of ['idle', 'thinking', 'clarify', 'success', 'error'] as const) expect(characterState({ ...facts, reducedMotion: true, activity })).toBe(activity);
  expect(characterState({ ...facts, reducedMotion: true, online: false })).toBe('offline');
  expect(characterState({ ...facts, reducedMotion: true, voiceListening: true })).toBe('listening');
});
it('offline takes precedence over pending request and voice, without commands', () => {
  expect(characterState({ ...facts, online: false, requestPending: true, voiceListening: true })).toBe('offline');
});
it('typing/request is thinking; only actual microphone capture is listening', () => {
  expect(characterState(facts)).toBe('idle');
  expect(characterState({ ...facts, requestPending: true })).toBe('thinking');
  expect(characterState({ ...facts, voiceListening: true })).toBe('listening');
});
it('preview/choice is clarify, only ack is success; cancellation/error never succeed', () => {
  expect(characterActivity('thinking', 'clarify')).toBe('clarify');
  expect(characterActivity('thinking', 'ack')).toBe('success');
  expect(characterActivity('success', 'error')).toBe('error');
  expect(characterActivity('clarify', 'idle')).toBe('idle');
});
it('deployment permits WASM compilation without opening JS eval or remote runtime', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const csp = config.headers.flatMap((row: { headers: { key: string; value: string }[] }) => row.headers).find((header: { key: string }) => header.key === 'Content-Security-Policy').value;
  expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).toContain("img-src 'self' data: blob:");
  const runtime = readFileSync('apps/web/src/features/gika/character/RiveCharacter.tsx', 'utf8');
  expect(runtime).toContain('RuntimeLoader.setWasmFallbackUrl(null)');
  expect(runtime).not.toMatch(/https:\/\/|apiRequest|sendCommand|firebase|console\.|localStorage|indexedDB/);
});
