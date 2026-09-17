type SeasonalGlyphProps = {
  eventId: string;
  className?: string;
};

export function SeasonalGlyph({ eventId, className }: SeasonalGlyphProps) {
  const common = { className, viewBox: '0 0 64 64', 'aria-hidden': true, focusable: false } as const;

  if (eventId === 'christmas') return <svg {...common}><path d="M32 5c2.2 12.9 4.1 14.8 17 17-12.9 2.2-14.8 4.1-17 17-2.2-12.9-4.1-14.8-17-17 12.9-2.2 14.8-4.1 17-17Z" fill="currentColor"/><path d="M49 39c1.1 6.7 2.1 7.7 8.8 8.8-6.7 1.1-7.7 2.1-8.8 8.8-1.1-6.7-2.1-7.7-8.8-8.8 6.7-1.1 7.7-2.1 8.8-8.8Z" fill="currentColor" opacity=".58"/></svg>;
  if (eventId === 'new-year') return <svg {...common}><path d="M32 7v16M32 41v16M7 32h16M41 32h16M14.3 14.3l11.3 11.3M38.4 38.4l11.3 11.3M49.7 14.3 38.4 25.6M25.6 38.4 14.3 49.7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="32" cy="32" r="5" fill="currentColor"/></svg>;
  if (eventId === 'easter') return <svg {...common}><path d="M32 7c12 0 20 13.3 20 28 0 13.1-7.6 22-20 22S12 48.1 12 35C12 20.3 20 7 32 7Z" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M17 31c9-8 21 8 30 0M16 42c10-7 22 8 32 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".7"/></svg>;
  if (eventId === 'festa-junina') return <svg {...common}><path d="M8 13c12 4 36 4 48 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M13 15v18l9-5 9 5V17M35 17v18l8-5 8 5V15" fill="currentColor" opacity=".85"/></svg>;
  if (eventId === 'halloween') return <svg {...common}><path d="M42 8c-14 3-23 15-20 29 2 10 10 17 20 19-15 5-31-4-35-20C3 19 14 3 31 1c4 0 8 2 11 7Z" fill="currentColor"/><path d="M46 25c4-6 9-6 13-1-5-1-8 1-10 5-1-2-2-3-3-4Z" fill="currentColor" opacity=".62"/></svg>;
  return <svg {...common}><circle cx="32" cy="32" r="12" fill="currentColor"/></svg>;
}
