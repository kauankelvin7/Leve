import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { CharacterState } from './controller';
import { GikaPortrait, restPortrait } from './GikaPortrait';
import offline from '../../../../../../assets/gika/rive/essential-bust/poses/offline.png?inline';
import listening from '../../../../../../assets/gika/rive/essential-bust/poses/listening.png?url';
import thinking from '../../../../../../assets/gika/rive/essential-bust/poses/thinking.png?url';
import clarify from '../../../../../../assets/gika/rive/essential-bust/poses/clarify.png?url';
import error from '../../../../../../assets/gika/rive/essential-bust/poses/error.png?url';
// Neutral and offline remain available without a network; other expressions load on demand.
const portraits: Record<CharacterState, string> = { rest: restPortrait, idle: restPortrait, blink: offline, offline, listening, thinking, clarify, success: restPortrait, error };
const AnimatedCharacter = lazy(() => import('./RiveCharacter'));
class CharacterBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export function useCharacterPresentation(profileReduceMotion: boolean) {
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(media.matches), visibility = () => setVisible(!document.hidden);
    media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return { visible, reducedMotion: profileReduceMotion || systemReduced };
}
export function GikaCharacter({ state, animate }: { state: CharacterState; animate: boolean }) {
  // V1 visual fallback: keep ACK semantics, use the master's natural smile.
  const visualState = state === 'success' ? 'idle' : state;
  return <span className="gika-character" aria-hidden="true" data-character-state={state} data-character-visual-state={visualState}>
    <GikaPortrait state={visualState} src={portraits[visualState]} />
    {animate && <CharacterBoundary><Suspense fallback={null}><AnimatedCharacter state={visualState} /></Suspense></CharacterBoundary>}
  </span>;
}
