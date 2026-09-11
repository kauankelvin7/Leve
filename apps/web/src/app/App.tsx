import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { Today } from '../features/activities/Today';
import { Calendar } from '../features/activities/Calendar';
import { useAuth } from '../features/identity/AuthProvider';
import { Login } from '../features/identity/Login';
import { Notes } from '../features/notes/Notes';
import { Shopping, ShoppingDetail } from '../features/shopping/Shopping';
import { Settings } from '../features/settings/Settings';
import { Trash } from '../features/trash/Trash';

const Demo = lazy(() => import('../features/demo/Demo'));

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => { document.getElementById('page-title')?.focus(); window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Protected() {
  const { user, session, loading } = useAuth();
  if (loading) return <main className="entry" role="status">Carregando sua agenda…</main>;
  if (!user || session?.membership !== 'active' || session.profile?.accountState !== 'active') return <Navigate to="/entrar" replace />;
  return <Outlet />;
}

function Shell() {
  const { session, logout } = useAuth();
  const links = [
    ['/hoje', 'calendar', 'Meu dia'], ['/calendario', 'calendar', 'Calendário'],
    ['/notas', 'note', 'Notas'], ['/compras', 'basket', 'Compras'],
  ] as const;
  return <div className={session?.profile?.reduceTransparency ? 'app-shell solid' : 'app-shell'}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <aside className="sidebar"><Link className="brand" to="/hoje">leve<span>.</span></Link><p className="brand-caption">Sua agenda pessoal</p>
      <nav aria-label="Principal">{links.map(([to, icon, label]) => <NavLink key={to} to={to}><Icon name={icon} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink className="profile-link" to="/configuracoes"><Icon name="profile" /><span><strong>{session?.profile?.displayName}</strong><small>Preferências</small></span></NavLink></div>
    </aside>
    <div className="main-wrapper" id="main-content"><Outlet /><footer className="page-footer"><span>Leve · sua agenda privada</span><button className="text-button" onClick={() => void logout()}>Sair</button></footer></div>
  </div>;
}

function EmptyPage({ title, text }: { title: string; text: string }) {
  useEffect(() => { document.title = `${title} · Leve`; }, [title]);
  return <main><header className="page-heading"><p className="eyebrow">Seu espaço</p><h1 id="page-title" tabIndex={-1}>{title}</h1></header><div className="empty"><p>{text}</p></div></main>;
}

function NotFound() {
  return <main className="entry"><h1 id="page-title" tabIndex={-1}>Página não encontrada</h1><Link className="button" to="/hoje">Voltar ao início</Link></main>;
}

export function App() {
  return <><RouteFocus /><Suspense fallback={<main className="entry" role="status">Carregando interface…</main>}><Routes>
    <Route path="/" element={<Navigate to="/hoje" replace />} />
    <Route path="/entrar" element={<Login />} /><Route path="/registrar" element={<Login mode="register" />} /><Route path="/recuperar" element={<Login mode="recovery" />} />
    <Route element={<Protected />}><Route element={<Shell />}>
      <Route path="/hoje" element={<Today />} />
      <Route path="/calendario" element={<Calendar />} />
      <Route path="/notas" element={<Notes />} />
      <Route path="/notas/:id" element={<EmptyPage title="Nota" text="Esta nota não está disponível." />} />
      <Route path="/compras" element={<Shopping />} />
      <Route path="/compras/:id" element={<ShoppingDetail />} />
      <Route path="/atividade/:id" element={<EmptyPage title="Atividade" text="Esta atividade não está disponível." />} />
      <Route path="/configuracoes" element={<Settings />} />
      <Route path="/lixeira" element={<Trash />} />
    </Route></Route>
    <Route path="/demo/*" element={<Demo />} /><Route path="*" element={<NotFound />} />
  </Routes></Suspense></>;
}
