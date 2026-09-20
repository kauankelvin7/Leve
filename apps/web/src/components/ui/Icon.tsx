const paths = {
  day: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1',
  review: 'M4 19V10m6 9V5m6 14v-6m5 8H3',
  note: 'M5 3h14v18H5V3m4 5h6m-6 4h6m-6 4h4',
  basket: 'm8 3-3 6m11-6 3 6M3 9h18l-2 11H5L3 9m6 4v3m6-3v3',
  trash: 'M5 7h14m-9 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14',
  profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  plus: 'M12 5v14M5 12h14',
  search: 'm21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  question: 'M9.1 9a3 3 0 1 1 4.8 2.4c-1.1.8-1.9 1.3-1.9 2.6m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  close: 'M6 6l12 12M18 6 6 18',
  restore: 'M9 7 5 11l4 4M5 11h8a6 6 0 1 1 0 12',
  bold: 'M7 5h6a4 4 0 0 1 0 8H7V5m0 8h7a4 4 0 0 1 0 8H7v-8',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  orderedList: 'M10 6h10M10 12h10M10 18h10M4 5h2v3M4 11h2l-2 3h2M4 17h2v4H4',
  highlight: 'm9 11 4 4 7-7-4-4-7 7M7 13l4 4-2 2H5v-4l2-2M4 21h16',
  volume: 'M11 5 6 9H3v6h3l5 4V5m4 4a4 4 0 0 1 0 6m-4.5-9.5a8 8 0 0 1 0 13',
  play: 'm8 5 11 7-11 7V5z',
  pause: 'M8 5v14m8-14v14',
  stop: 'M7 7h10v10H7z',
  check: 'm5 12 4 4L19 6',
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
