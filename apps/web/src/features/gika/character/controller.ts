/** Visual facts only. No domain data, narration, IDs or authority to execute an action. */
export const characterModes = { rest: 0, idle: 1, blink: 2, listening: 3, thinking: 4, clarify: 5, success: 6, error: 7, offline: 8 } as const;
export type CharacterState = keyof typeof characterModes;
export type CharacterEvent = 'working' | 'clarify' | 'ack' | 'error' | 'idle';
export type CharacterActivity = 'idle' | 'thinking' | 'clarify' | 'success' | 'error';
export function characterActivity(_current: CharacterActivity, event: CharacterEvent): CharacterActivity {
  switch (event) {
    case 'working': return 'thinking';
    case 'ack': return 'success';
    case 'clarify': return 'clarify';
    case 'error': return 'error';
    case 'idle': return 'idle';
  }
}
export function characterState(facts: { open: boolean; online: boolean; visible: boolean; reducedMotion: boolean; requestPending: boolean; voiceListening: boolean; activity: CharacterActivity }): CharacterState {
  if (!facts.open || !facts.visible || facts.reducedMotion) return 'rest';
  if (!facts.online) return 'offline';
  if (facts.requestPending || facts.activity === 'thinking') return 'thinking';
  if (facts.voiceListening) return 'listening';
  return facts.activity;
}
