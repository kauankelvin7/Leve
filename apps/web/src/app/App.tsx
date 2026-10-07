import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusPage } from '../components/ui/StatusPage';
import { SeasonalExperience } from '../components/seasonal/SeasonalExperience';
import { asStatusPageCode } from './statusPage';
import { useAuth } from '../features/identity/AuthProvider';
import { Login } from '../features/identity/Login';
import { OutboxStatus } from '../features/content/OutboxStatus';
import { OfflineStatus } from '../features/content/OfflineStatus';
import { Tutorial } from '../features/content/Tutorial';
import { NotificationBanner } from '../features/content/NotificationBanner';
import { SessionRecovery } from '../features/activities/SessionRecovery';
import { ActiveTimerBar } from '../features/activities/ActiveTimerBar';
import { Avatar } from '../components/ui/Avatar';
import { RouteMetadata } from './RouteMetadata';
import { Privacy } from '../features/content/Privacy';
import { Terms } from '../features/content/Terms';
import { GikaLauncher } from '../features/gika/GikaLauncher';
import styles from './AppShell.module.css';
import { SecondaryNavigation, secondaryLinks } from './SecondaryNavigation';

const Demo = lazy(() => import('../features/demo/Demo'));
const Today = lazy(() => import('../features/activities/Today').then(module => ({ default: module.Today })));
const Calendar = lazy(() => import('../features/activities/Calendar').then(module => ({ default: module.Calendar })));
const Notes = lazy(() => import('../features/notes/Notes').then(module => ({ default: module.Notes })));
const NoteDetail = lazy(() => import('../features/notes/NoteDetail').then(module => ({ default: module.NoteDetail })));
const Shopping = lazy(() => import('../features/shopping/Shopping').then(module => ({ default: module.Shopping })));
const ShoppingDetail = lazy(() => import('../features/shopping/ShoppingDetail').then(module => ({ default: module.ShoppingDetail })));
const Settings = lazy(() => import('../features/settings/Settings').then(module => ({ default: module.Settings })));
const Trash = lazy(() => import('../features/trash/Trash').then(module => ({ default: module.Trash })));
const Search = lazy(() => import('../features/content/Search').then(module => ({ default: module.Search })));
const ActivityDetail = lazy(() => import('../features/activities/ActivityDetail').then(module => ({ default: module.ActivityDetail })));
const Review = lazy(() => import('../features/activities/Review').then(module => ({ default: module.Review })));

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const focus = () => {
      const title = document.getElementById('page-title');
      if (!title) return false;
      title.focus({ preventScroll: true });
      return true;
    };
    if (focus()) return;
    const observer = new MutationObserver(() => { if (focus()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

function Protected() {
  const { user, session, loading, errorStatus, refresh, logout } = useAuth();
  if (loading) return <LoadingState variant="screen" label="Preparando sua agenda…" />;
  if (!user || !user.emailVerified) return <Navigate to="/entrar" replace />;
  if (errorStatus !== null) return <StatusPage status={asStatusPageCode(errorStatus)} onAction={errorStatus === 401 ? () => void logout() : () => void refresh()} />;
  if (!session) return <Navigate to="/entrar" replace />;
  if (session.membership !== 'active' || session.profile?.accountState !== 'active') return <StatusPage status={403} onAction={() => void refresh()} />;
  return <Outlet />;
}

function Shell() {
  const { session, logout } = useAuth();
  const { pathname } = useLocation();
  const links = [
    ['/hoje', 'day', 'Meu dia'], ['/calendario', 'calendar', 'Calendário'],
    ['/notas', 'note', 'Notas'], ['/compras', 'basket', 'Compras'],
  ] as const;
  const shellClasses = ['app-shell', styles.shell, session?.profile?.reduceTransparency ? 'solid' : '', session?.profile?.reduceMotion ? 'reduce-motion' : '', session?.profile?.highContrast ? 'high-contrast' : ''].filter(Boolean).join(' ');
  return <div className={shellClasses}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <aside className={`sidebar glass ${styles.sidebar}`}><Link className="brand" to="/hoje">leve<span>.</span></Link><p className="brand-caption">Sua agenda pessoal</p>
      <nav className={styles.primaryNavigation} aria-label="Principal">{links.map(([to, icon, label]) => <NavLink key={to} to={to} aria-label={label} title={label}><Icon name={icon} /><span className="nav-label">{label}</span></NavLink>)}<GikaLauncher key={session?.uid} /></nav>
      <div className="sidebar-bottom"><NavLink to="/buscar"><Icon name="search" />Buscar</NavLink><NavLink className={`profile-link ${styles.profile}`} to="/configuracoes" aria-label="Perfil e preferências"><Avatar className="profile-avatar" name={session?.profile?.displayName ?? 'Leve'} seed={session?.profile?.avatarSeed} decorative /><span><strong>{session?.profile?.displayName || 'Seu perfil'}</strong><small>Preferências</small></span></NavLink></div>
    </aside>
    <div className="main-wrapper" id="main-content" tabIndex={-1}>
      <header className={`workspace-bar ${styles.workspaceBar}`}>
        <div className="mobile-brand"><Link className="brand" to="/hoje" aria-label="Leve, Meu dia">leve<span>.</span></Link></div>
        <strong className={styles.currentPage}>{[...links, ...secondaryLinks].find(([to]) => pathname.startsWith(to))?.[2] ?? (pathname === '/buscar' ? 'Buscar' : pathname.startsWith('/atividade') ? 'Atividade' : 'Preferências')}</strong>
        <div className="workspace-actions">
          <NavLink className={styles.mobileAction} to="/buscar" aria-label="Buscar"><Icon name="search" /></NavLink>
          <SecondaryNavigation />
          <Link className={`quick-add ${styles.quickAdd}`} to="/hoje?nova=1" aria-label="Adicionar atividade" title="Adicionar atividade"><Icon name="plus" /></Link>
          <NavLink className={`${styles.mobileAction} ${styles.mobileProfile}`} to="/configuracoes" aria-label="Perfil e preferências"><Avatar name={session?.profile?.displayName ?? 'Leve'} seed={session?.profile?.avatarSeed} decorative /></NavLink>
          <span className="workspace-private">Agenda pessoal</span>
        </div>
      </header>
      <Tutorial /><NotificationBanner /><OfflineStatus /><OutboxStatus /><SessionRecovery /><ActiveTimerBar />
      <Suspense fallback={<LoadingState variant="cards" label="Abrindo sua página…" />}><Outlet /></Suspense>
      <footer className={`page-footer ${styles.footer}`}>
        <div className={styles.footerIdentity}><span className={styles.footerBrand}>leve<span>.</span></span><span>Sua agenda privada</span></div>
        <nav className={styles.legalFooter} aria-label="Informações legais"><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos</Link></nav>
        <button className={`text-button ${styles.logout}`} onClick={() => void logout()}>Sair</button>
      </footer>
    </div>
  </div>;
}

function NotFound() {
  return <StatusPage status={404} />;
}

export function App() {
  return <><RouteFocus /><RouteMetadata /><SeasonalExperience /><Suspense fallback={<LoadingState variant="screen" label="Abrindo seu espaço…" />}><Routes>
    <Route path="/" element={<Navigate to="/hoje" replace />} />
    <Route path="/entrar" element={<Login />} /><Route path="/registrar" element={<Login mode="register" />} /><Route path="/recuperar" element={<Login mode="recovery" />} /><Route path="/privacidade" element={<Privacy />} /><Route path="/termos" element={<Terms />} />
    <Route element={<Protected />}><Route element={<Shell />}>
      <Route path="/hoje" element={<Today />} />
      <Route path="/calendario" element={<Calendar />} />
      <Route path="/notas" element={<Notes />} />
      <Route path="/notas/:id" element={<NoteDetail />} />
      <Route path="/compras" element={<Shopping />} />
      <Route path="/compras/:id" element={<ShoppingDetail />} />
      <Route path="/atividade/:id" element={<ActivityDetail />} />
      <Route path="/revisao" element={<Review />} />
      <Route path="/buscar" element={<Search />} />
      <Route path="/configuracoes" element={<Settings />} />
      <Route path="/lixeira" element={<Trash />} />
    </Route></Route>
    <Route path="/demo/*" element={<Demo />} /><Route path="*" element={<NotFound />} />
  </Routes></Suspense></>;
}
