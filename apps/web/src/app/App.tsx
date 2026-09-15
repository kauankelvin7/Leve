import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusPage } from '../components/ui/StatusPage';
import { asStatusPageCode } from './statusPage';
import { useAuth } from '../features/identity/AuthProvider';
import { Login } from '../features/identity/Login';
import { OutboxStatus } from '../features/content/OutboxStatus';
import { Tutorial } from '../features/content/Tutorial';
import { NotificationBanner } from '../features/content/NotificationBanner';
import { SessionRecovery } from '../features/activities/SessionRecovery';

const Demo = lazy(() => import('../features/demo/Demo'));
const Today = lazy(() => import('../features/activities/Today').then(module => ({ default: module.Today })));
const Calendar = lazy(() => import('../features/activities/Calendar').then(module => ({ default: module.Calendar })));
const Notes = lazy(() => import('../features/notes/Notes').then(module => ({ default: module.Notes })));
const NoteDetail = lazy(() => import('../features/notes/NoteDetail').then(module => ({ default: module.NoteDetail })));
const Shopping = lazy(() => import('../features/shopping/Shopping').then(module => ({ default: module.Shopping })));
const ShoppingDetail = lazy(() => import('../features/shopping/Shopping').then(module => ({ default: module.ShoppingDetail })));
const Settings = lazy(() => import('../features/settings/Settings').then(module => ({ default: module.Settings })));
const Trash = lazy(() => import('../features/trash/Trash').then(module => ({ default: module.Trash })));
const Search = lazy(() => import('../features/content/Search').then(module => ({ default: module.Search })));
const ActivityDetail = lazy(() => import('../features/activities/ActivityDetail').then(module => ({ default: module.ActivityDetail })));
const Review = lazy(() => import('../features/activities/Review').then(module => ({ default: module.Review })));

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => { document.getElementById('page-title')?.focus(); window.scrollTo(0, 0); }, [pathname]);
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
    ['/notas', 'note', 'Notas'], ['/compras', 'basket', 'Compras'], ['/lixeira', 'trash', 'Lixeira'],
    ['/revisao', 'review', 'Revisão'],
  ] as const;
  return <div className={session?.profile?.reduceTransparency ? 'app-shell solid' : 'app-shell'}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <aside className="sidebar"><Link className="brand" to="/hoje">leve<span>.</span></Link><p className="brand-caption">Sua agenda pessoal</p>
      <nav aria-label="Principal">{links.map(([to, icon, label]) => <NavLink key={to} to={to} aria-label={label} title={label}><Icon name={icon} /><span className="nav-label">{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/buscar"><Icon name="search" />Buscar</NavLink><NavLink className="profile-link" to="/configuracoes"><span className="profile-avatar" aria-hidden="true">{session?.profile?.displayName?.slice(0, 1).toLocaleUpperCase('pt-BR')}</span><span><strong>{session?.profile?.displayName}</strong><small>Preferências</small></span></NavLink></div>
    </aside>
    <div className="main-wrapper" id="main-content" tabIndex={-1}>
      <div className="mobile-brand"><span className="brand">leve<span>.</span></span><div className="mobile-actions"><NavLink to="/buscar" aria-label="Buscar"><Icon name="search" /></NavLink><NavLink to="/configuracoes" aria-label="Perfil e preferências"><Icon name="profile" /></NavLink></div></div>
      <div className="workspace-bar"><span><span className="workspace-prefix">Meu espaço <span aria-hidden="true">/</span></span><strong>{links.find(([to]) => pathname.startsWith(to))?.[2] ?? (pathname === '/buscar' ? 'Buscar' : pathname === '/revisao' ? 'Revisão' : pathname.startsWith('/atividade') ? 'Atividade' : 'Preferências')}</strong></span><span className="workspace-actions"><Link className="quick-add" to="/hoje?nova=1" aria-label="Adicionar atividade" title="Adicionar atividade"><Icon name="plus" /><span className="visually-hidden">Adicionar atividade</span></Link><span className="workspace-private">Agenda pessoal</span></span></div>
      <Tutorial /><NotificationBanner /><OutboxStatus /><SessionRecovery /><Outlet /><footer className="page-footer"><span>Leve · sua agenda privada</span><button className="text-button" onClick={() => void logout()}>Sair</button></footer>
    </div>
  </div>;
}

function NotFound() {
  return <StatusPage status={404} />;
}

export function App() {
  return <><RouteFocus /><Suspense fallback={<LoadingState variant="screen" label="Abrindo seu espaço…" />}><Routes>
    <Route path="/" element={<Navigate to="/hoje" replace />} />
    <Route path="/entrar" element={<Login />} /><Route path="/registrar" element={<Login mode="register" />} /><Route path="/recuperar" element={<Login mode="recovery" />} />
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
