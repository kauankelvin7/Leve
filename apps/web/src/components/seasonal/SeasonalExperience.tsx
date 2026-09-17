import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isSeasonalDetailsEnabled } from '../../../../../packages/domain/src/identity';
import { useAuth } from '../../features/identity/AuthProvider';
import { activeSeasonalPeriod, civilDateInTimeZone, seasonalPresentationMode, seasonalSurfaceForPath } from '../../platform/seasonal/seasonalResolver';
import { hasSeenSeasonalIntro, markSeasonalIntroSeen, storedSeasonalDetailsEnabled, storeSeasonalDetailsEnabled } from '../../platform/seasonal/seasonalStorage';
import { SeasonalGlyph } from './SeasonalGlyph';
import './seasonal-experience.css';

function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function seasonalFavicon(eventId: string, color: string, background: string): string {
  const shapes: Record<string, string> = {
    christmas: '<path d="M32 7c2 12 4 14 16 16-12 2-14 4-16 16-2-12-4-14-16-16 12-2 14-4 16-16Z"/>',
    'new-year': '<path d="M32 8v48M8 32h48M15 15l34 34M49 15 15 49" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    easter: '<path d="M32 7c12 0 19 13 19 27 0 14-7 23-19 23S13 48 13 34C13 20 20 7 32 7Z" fill="none" stroke="currentColor" stroke-width="5"/>',
    'festa-junina': '<path d="M8 13c13 4 35 4 48 0M14 16v20l9-6 9 6V17M36 17v19l8-6 8 6V15"/>',
    halloween: '<path d="M43 8c-14 3-23 15-20 29 2 10 10 17 20 19-16 5-31-5-35-20C4 19 15 3 32 1c4 0 8 2 11 7Z"/>',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="${color}"><rect width="64" height="64" rx="16" fill="${background}"/><g fill="currentColor">${shapes[eventId] ?? shapes.christmas}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function SeasonalExperience() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const [systemReduceMotion, setSystemReduceMotion] = useState(prefersReducedMotion);
  const [introActive, setIntroActive] = useState(false);

  const profile = session?.profile ?? null;
  const enabled = profile ? isSeasonalDetailsEnabled(profile) : storedSeasonalDetailsEnabled();
  const timeZone = profile?.timeZone ?? deviceTimeZone();
  const civilDate = civilDateInTimeZone(timeZone);
  const surface = seasonalSurfaceForPath(pathname);
  const period = useMemo(() => activeSeasonalPeriod(civilDate, surface), [civilDate, surface]);
  const mode = seasonalPresentationMode(enabled, profile?.reduceMotion ?? false, systemReduceMotion);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (profile) storeSeasonalDetailsEnabled(enabled);
  }, [enabled, profile]);

  useEffect(() => {
    const root = document.documentElement;
    if (!period || mode === 'off') {
      delete root.dataset.seasonalEvent;
      delete root.dataset.seasonalMode;
      return;
    }
    root.dataset.seasonalEvent = period.eventId;
    root.dataset.seasonalMode = mode;
    return () => {
      delete root.dataset.seasonalEvent;
      delete root.dataset.seasonalMode;
    };
  }, [period?.eventId, mode]);

  useEffect(() => {
    if (!period || mode !== 'animated' || !period.intro || hasSeenSeasonalIntro(period)) {
      setIntroActive(false);
      return;
    }
    markSeasonalIntroSeen(period);
    setIntroActive(true);
    const timer = window.setTimeout(() => setIntroActive(false), 3000);
    return () => window.clearTimeout(timer);
  }, [period?.periodId, mode]);

  useEffect(() => {
    if (!period || mode === 'off') return;
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) return;
    const previous = link.href;
    const styles = getComputedStyle(document.documentElement);
    const color = styles.getPropertyValue('--color-action-primary').trim() || '#486456';
    const background = styles.backgroundColor || '#f4f6f4';
    link.href = seasonalFavicon(period.eventId, color, background);
    return () => { link.href = previous; };
  }, [period?.eventId, mode, profile?.appearance, profile?.colorTheme]);

  if (!period || mode === 'off') return null;

  const positions = surface === 'global'
    ? ['a']
    : surface === 'login'
      ? ['a', 'b', 'c', 'd']
      : ['a', 'b', 'c'];

  return <div className={`seasonal-layer seasonal-${period.eventId} seasonal-${mode} seasonal-surface-${surface}`} data-seasonal-period={period.periodId} aria-hidden="true">
    <div className="seasonal-ambient">
      {positions.map(position => <SeasonalGlyph key={position} eventId={period.eventId} className={`seasonal-glyph seasonal-glyph-${position}`} />)}
    </div>
    <span className="seasonal-brand-mark"><SeasonalGlyph eventId={period.eventId} /></span>
    {introActive ? <div className="seasonal-intro"><SeasonalGlyph eventId={period.eventId} className="seasonal-intro-glyph" /></div> : null}
  </div>;
}
