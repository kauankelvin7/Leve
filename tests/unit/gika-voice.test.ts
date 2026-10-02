import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createVoiceInput, nativeRecognition, voiceBusy, type Recognition, type VoiceState } from '../../apps/web/src/features/gika/useVoiceInput';
import { GIKA_MAX_INPUT } from '../../apps/web/src/features/gika/conversation';

class Native implements Recognition {
  static instances: Native[] = [];
  lang = ''; continuous = true; interimResults = true; maxAlternatives = 0;
  onstart: Recognition['onstart'] = null; onspeechend: Recognition['onspeechend'] = null;
  onresult: Recognition['onresult'] = null; onerror: Recognition['onerror'] = null; onend: Recognition['onend'] = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Native.instances.push(this); }
}
afterEach(() => { Native.instances = []; vi.unstubAllGlobals(); });
function fixture(base = '') {
  let draft = base;
  const states: VoiceState[] = [], text = vi.fn((value: string) => { draft = value; });
  const controller = createVoiceInput(Native, state => states.push(state), text, () => draft);
  return { controller, states, text, draft: () => draft, edit: (value: string) => { draft = value; } };
}
const result = (transcript: string, isFinal = true) => ({ results: [{ isFinal, 0: { transcript } }] });

it.each(['o que eu tenho hoje', 'academia amanhã', 'organiza meu dia'])('PT-BR final is draft only: %s', transcript => {
  const f = fixture(); f.controller.start(''); const native = Native.instances[0]!;
  expect(native).toMatchObject({ lang: 'pt-BR', continuous: false, interimResults: false, maxAlternatives: 1 });
  native.onstart!(); expect(voiceBusy(f.states.at(-1)!)).toBe(true);
  native.onresult!(result(transcript)); expect(f.text).not.toHaveBeenCalled();
  native.onspeechend!(); expect(native.stop).toHaveBeenCalledOnce(); native.onend!();
  expect(f.draft()).toBe(transcript); expect(f.text).toHaveBeenCalledOnce(); expect(f.states.at(-1)?.status).toBe('ready');
});
it('partial results never enter the draft; cumulative final results do not duplicate words', () => {
  const f = fixture('Já digitado\n'); f.controller.start(f.draft()); const native = Native.instances[0]!;
  native.onresult!(result('ignorado', false)); expect(f.text).not.toHaveBeenCalled();
  native.onresult!(result('academia')); native.onresult!({ results: [{ isFinal: true, 0: { transcript: 'academia' } }, { isFinal: true, 0: { transcript: 'amanhã' } }] }); native.onend!();
  expect(f.draft()).toBe('Já digitado\nacademia amanhã');
});
it.each(['cancel', 'dispose'] as const)('%s invalidates late callbacks, including unmount/account replacement', operation => {
  const f = fixture('Preservado'); f.controller.start(f.draft()); const native = Native.instances[0]!, lateResult = native.onresult!, lateEnd = native.onend!;
  f.controller[operation](); lateResult(result('não inserir')); lateEnd();
  expect(f.draft()).toBe('Preservado'); expect(f.text).not.toHaveBeenCalled(); expect(native.abort).toHaveBeenCalledOnce();
});
it('double start captures once; cancelled capture cannot affect a new session', () => {
  const f = fixture(); f.controller.start(''); const old = Native.instances[0]!, late = old.onend!;
  f.controller.start(''); expect(Native.instances).toHaveLength(1); f.controller.cancel(); f.controller.start(''); late();
  expect(Native.instances).toHaveLength(2); expect(f.text).not.toHaveBeenCalled();
});
it.each(['not-allowed', 'network', 'no-speech'])('%s preserves typed text without a fake transcript', error => {
  const f = fixture('Preservado'); f.controller.start(f.draft()); Native.instances[0]!.onerror!({ error });
  expect(f.draft()).toBe('Preservado'); expect(f.text).not.toHaveBeenCalled(); expect(f.states.at(-1)?.status).toBe(error === 'not-allowed' ? 'denied' : 'error');
});
it('changed draft and overlong speech are rejected without overwriting text', () => {
  for (const changed of [true, false]) {
    const f = fixture('Digitado'); f.controller.start(f.draft()); const native = Native.instances.at(-1)!;
    if (changed) f.edit('Novo texto'); native.onresult!(result(changed ? 'fala' : 'a'.repeat(GIKA_MAX_INPUT))); native.onend!();
    expect(f.draft()).toBe(changed ? 'Novo texto' : 'Digitado'); expect(f.text).not.toHaveBeenCalled(); expect(f.states.at(-1)?.status).toBe('error');
  }
});
it('unsupported, insecure context and blocked policy do not start capture', () => {
  const text = vi.fn(), state = vi.fn(); createVoiceInput(undefined, state, text, () => '').start('');
  expect(state).toHaveBeenCalledWith({ status: 'unsupported' }); expect(text).not.toHaveBeenCalled();
  vi.stubGlobal('window', { isSecureContext: true, webkitSpeechRecognition: Native });
  vi.stubGlobal('document', { featurePolicy: { allowsFeature: () => true } }); expect(nativeRecognition()).toBe(Native);
  vi.stubGlobal('document', { permissionsPolicy: { allowsFeature: () => false } }); expect(nativeRecognition()).toBeUndefined();
  vi.stubGlobal('window', { isSecureContext: false, SpeechRecognition: Native }); expect(nativeRecognition()).toBeUndefined();
});
it('native start rejection preserves draft and reports permission denial', () => {
  class Denied extends Native { constructor() { super(); this.start.mockImplementation(() => { throw new DOMException('Denied', 'NotAllowedError'); }); } }
  const state = vi.fn(), text = vi.fn(); createVoiceInput(Denied, state, text, () => 'Preservado').start('Preservado');
  expect(state.mock.calls.at(-1)?.[0].status).toBe('denied'); expect(text).not.toHaveBeenCalled();
});
it('deployment grants microphone only to self; voice has no transport, persistence or command import', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const headers = config.headers.flatMap((entry: { headers: { key: string; value: string }[] }) => entry.headers);
  expect(headers.filter((entry: { key: string }) => entry.key === 'Permissions-Policy')).toEqual([{ key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' }]);
  const source = readFileSync('apps/web/src/features/gika/useVoiceInput.ts', 'utf8');
  expect(source).not.toMatch(/sendCommand|apiRequest|firebase|MediaRecorder|\bBlob\b|fetch\s*\(|localStorage|indexedDB|console\./);
});
