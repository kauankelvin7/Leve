import { createContext, useContext } from 'react';
import type { CharacterEvent } from './controller';
/** Panel-scoped, payload-free UI notifications. They cannot call commands or change contracts. */
export const CharacterEvents = createContext<(event: CharacterEvent) => void>(() => undefined);
export const useCharacterEvent = () => useContext(CharacterEvents);
