import type { CharacterState } from './controller';
import rest from '../../../../../../assets/gika/rive/essential-bust/poses/rest.png?inline';

export const restPortrait = rest;

export function GikaPortrait({ state, src = restPortrait }: { state: CharacterState; src?: string }) {
  return <img data-static-state={state} src={src} alt="" width="135" height="133" draggable={false} />;
}
