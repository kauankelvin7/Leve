import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import styles from './AppShell.module.css';

export const secondaryLinks = [['/lixeira', 'trash', 'Lixeira'], ['/revisao', 'review', 'Revisão']] as const;

export function SecondaryNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => { if (details.current) details.current.open = false; }, [pathname]);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && details.current?.open) {
        details.current.open = false;
        summary.current?.focus();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return <details ref={details} className={styles.secondaryNavigation}>
    <summary ref={summary} aria-label="Mais páginas" title="Mais páginas">Mais <span aria-hidden="true">⌄</span></summary>
    <nav aria-label="Mais páginas">{secondaryLinks.map(([to, icon, label]) =>
      <NavLink key={to} to={to} onClick={() => { if (details.current) details.current.open = false; }}>
        <Icon name={icon} /><span>{label}</span><Icon name="chevronRight" />
      </NavLink>
    )}</nav>
  </details>;
}
