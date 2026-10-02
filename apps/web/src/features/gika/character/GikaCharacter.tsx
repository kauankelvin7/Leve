import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { CharacterState } from './controller';
import portrait from '../../../../../../assets/gika/source/hybrid-bust-v2/source-bust-matte-clean.png?inline';
const AnimatedCharacter = lazy(() => import('./RiveCharacter'));
class CharacterBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export function GikaPortrait() {
  return <img src={portrait} alt="" width="135" height="133" draggable={false} />;
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
  return <span className="gika-character" aria-hidden="true" data-character-state={state}>
    <GikaPortrait />
    {animate && <CharacterBoundary><Suspense fallback={null}><AnimatedCharacter state={state} /></Suspense></CharacterBoundary>}
  </span>;
}
