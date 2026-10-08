export const FILM_FPS = 60;
export const FILM_DURATION = 72;

// V3 retains the 72-second arc while removing the standalone brand card.
// The same note now carries the opening through the closing match cut.
export const timeline = [
  { id: 'opening', from: 0, duration: 5 },
  { id: 'today', from: 5, duration: 9 },
  { id: 'calendar', from: 14, duration: 7 },
  { id: 'mobile', from: 21, duration: 4 },
  { id: 'notes', from: 25, duration: 8 },
  { id: 'shopping', from: 33, duration: 7 },
  { id: 'gika', from: 40, duration: 12 },
  { id: 'offline', from: 52, duration: 12 },
  { id: 'closing', from: 64, duration: 8 },
] as const;
