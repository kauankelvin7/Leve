import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { addDays, formatCivil, todayCivil, validCivil, weekDays } from './dates';

type Category = 'studies' | 'personal' | 'health' | 'home';
type DemoActivity = { id: string; title: string; date: string; time: string; category: Category; done: boolean };
const categories: Record<Category, string> = { studies: 'Estudos', personal: 'Pessoal', health: 'Saúde', home: 'Casa & compras' };
const destinations = [
  { path: 'hoje', label: 'Meu dia', icon: 'day' },
  { path: 'calendario', label: 'Calendário', icon: 'calendar' },
  { path: 'notas', label: 'Notas', icon: 'note' },
  { path: 'compras', label: 'Compras', icon: 'basket' },
] as const;

function useToday() {
  const [today, setToday] = useState(todayCivil);
  useEffect(() => {
    const refresh = () => setToday(todayCivil());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return today;
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = `${title} · Leve demo`; heading.current?.focus(); }, [title]);
  return <header className="page-heading"><p className="eyebrow">{subtitle}</p><h1 ref={heading} id="page-title" tabIndex={-1}>{title}</h1></header>;
}

function Notes() {
  return <><PageTitle title="Notas" subtitle="Ideias e detalhes para guardar" /><div className="note-grid">
    <article className="note butter"><p className="eyebrow">Fixada · exemplo</p><h2>Para a próxima semana</h2><p>Separar o material de estudo e conferir as datas das entregas.</p><p>Deixar os documentos juntos antes de sair.</p></article>
    <article className="note studies"><p className="eyebrow">Estudos · exemplo</p><h2>Projeto da faculdade</h2><p>Revisar requisitos, organizar referências e preparar as perguntas para a próxima aula.</p></article>
  </div><p className="muted">Notas fictícias para explorar a leitura. Edição e salvamento chegam em uma próxima etapa.</p></>;
}

function Shopping() {
  const [items, setItems] = useState([{ id: 'rice', name: 'Arroz', quantity: '1 pacote', checked: false }, { id: 'banana', name: 'Banana', quantity: '1 dúzia', checked: false }, { id: 'coffee', name: 'Café', quantity: '1 pacote', checked: true }]);
  const remaining = items.filter(item => !item.checked).length;
  return <><PageTitle title="Compras" subtitle="Uma coisa a menos para lembrar" /><section className="panel shopping"><div className="section-heading"><h2>Lista da semana</h2><span>{remaining} pendentes</span></div><p className="muted">Lista de exemplo · marcações temporárias</p>
    {items.map(item => <label className="shopping-item" key={item.id}><input type="checkbox" checked={item.checked} onChange={event => { const checked = event.target.checked; setItems(previous => previous.map(current => current.id === item.id ? { ...current, checked } : current)); }} /><span className={item.checked ? 'completed' : ''}>{item.name}<small>{item.quantity}</small></span><span className="muted">{item.checked ? 'Comprado' : 'Pendente'}</span></label>)}
    <p role="status" className="muted">{remaining === 0 ? 'Todos os itens do exemplo foram marcados.' : `${remaining} ${remaining === 1 ? 'item' : 'itens'} para comprar.`}</p>
  </section></>;
}

function Agenda({ calendar, today, activities, onToggle, onAdd }: { calendar: boolean; today: string; activities: DemoActivity[]; onToggle: (id: string) => void; onAdd: (activity: DemoActivity) => void }) {
  const [params, setParams] = useSearchParams();
  const requestedDate = params.get('dia') ?? '';
  const selected = validCivil(requestedDate) ? requestedDate : today;
  const requestedFilter = params.get('categoria') ?? '';
  const filter = Object.hasOwn(categories, requestedFilter) ? requestedFilter : '';
  const dialog = useRef<HTMLDialogElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const monthStart = `${selected.slice(0, 7)}-01`;
  const days = calendar ? Array.from({ length: 42 }, (_, index) => addDays(weekDays(monthStart)[0]!, index)) : weekDays(selected);
  const visible = activities.filter(activity => activity.date === selected && (!filter || activity.category === filter)).sort((left, right) => (left.time || '99:99').localeCompare(right.time || '99:99'));
  function selectDate(date: string) { const next = new URLSearchParams(params); next.set('dia', date); setParams(next); }
  function shiftMonth(direction: number) {
    const date = new Date(`${monthStart}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    selectDate(date.toISOString().slice(0, 10));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get('title') ?? '').trim();
    const input = form.elements.namedItem('title') as HTMLInputElement;
    input.setCustomValidity(title ? '' : 'Digite um título para a tarefa.');
    if (!form.reportValidity()) return;
    onAdd({ id: crypto.randomUUID(), title, date: selected, time: String(fields.get('time') ?? ''), category: fields.get('category') as Category, done: false });
    form.reset(); dialog.current?.close();
    setAnnouncement('Tarefa adicionada à demonstração. Não foi salva.');
  }
  return <><PageTitle title={calendar ? 'Calendário' : 'Meu dia'} subtitle={calendar ? 'Seu mês, com espaço para cada coisa' : formatCivil(selected, { weekday: 'long', day: 'numeric', month: 'long' })} />
    <div className="agenda-layout"><section className="agenda-main" aria-label="Agenda demonstrativa">
      <div className="toolbar"><h2>{formatCivil(selected, { month: 'long', year: 'numeric' })}</h2><div className="toolbar-actions">
        <button aria-label={calendar ? 'Mês anterior' : 'Semana anterior'} onClick={() => calendar ? shiftMonth(-1) : selectDate(addDays(selected, -7))}>‹</button>
        <button onClick={() => selectDate(today)}>Hoje</button>
        <button aria-label={calendar ? 'Próximo mês' : 'Próxima semana'} onClick={() => calendar ? shiftMonth(1) : selectDate(addDays(selected, 7))}>›</button>
      </div></div>
      <div className={`day-picker ${calendar ? 'month-picker' : ''}`} role="group" aria-label={calendar ? 'Dias do mês' : 'Dias da semana'}>
        {days.map(date => <button key={date} data-date={date} tabIndex={date === selected ? 0 : -1} aria-label={formatCivil(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={date === selected} aria-current={date === today ? 'date' : undefined} className={`${date === selected ? 'selected' : ''} ${date.slice(0, 7) !== selected.slice(0, 7) ? 'adjacent' : ''}`} onClick={() => selectDate(date)} onKeyDown={event => {
          const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
          const offset = offsets[event.key];
          const target = event.key === 'Home' ? weekDays(date)[0] : event.key === 'End' ? weekDays(date)[6] : offset !== undefined ? addDays(date, offset) : undefined;
          if (!target) return;
          event.preventDefault(); selectDate(target);
          requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus());
        }}>
          <span>{formatCivil(date, { weekday: 'short' }).replace('.', '')}</span><strong>{Number(date.slice(-2))}</strong><small>{date === today ? 'Hoje' : '\u00a0'}</small>
        </button>)}
      </div>
      <div className="section-heading activity-heading"><h2>{calendar ? formatCivil(selected, { day: 'numeric', month: 'long' }) : 'Atividades do dia'}</h2><button ref={addButton} className="primary" onClick={() => dialog.current?.showModal()}><Icon name="plus" />Adicionar tarefa</button></div>
      <label className="filter">Categoria<select value={filter in categories ? filter : ''} onChange={event => { const next = new URLSearchParams(params); next.set('categoria', event.target.value); setParams(next); }}><option value="">Todas as categorias</option>{Object.entries(categories).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      <div className="activity-list">{visible.length === 0 ? <div className="empty"><h3>Nenhuma atividade {filter ? 'nesta categoria' : 'neste dia'}</h3><p>Adicione uma tarefa para experimentar a organização.</p></div> : visible.map(activity => <article className="activity-row" key={activity.id}><span className="activity-time">{activity.time || 'Sem horário'}</span><label className={`activity-card ${activity.category}`}><input type="checkbox" checked={activity.done} onChange={() => { onToggle(activity.id); setAnnouncement(`${activity.title}: ${activity.done ? 'reaberta' : 'concluída'} na demonstração.`); }} /><span><strong className={activity.done ? 'completed' : ''}>{activity.title}</strong><small>{categories[activity.category]} · {activity.done ? 'Concluída' : 'Tarefa'}</small></span></label></article>)}</div>
      <p className="muted" role="status">{announcement}</p>
    </section><aside className="agenda-aside"><article className="note butter"><p className="eyebrow">Nota fixada · exemplo</p><h2>Não esquecer</h2><p>Separar os documentos e conferir o material antes de sair.</p><Link to="/demo/notas" className="text-link">Ver notas <span aria-hidden="true">↗</span></Link></article><section className="panel"><p className="eyebrow">Casa & compras</p><h2>Lista da semana</h2><p>Arroz, banana e café.</p><Link className="text-link" to="/demo/compras">Abrir lista <span aria-hidden="true">↗</span></Link></section><p className="aside-caption">Exemplos para explorar.<br />O seu conteúdo será privado.</p></aside></div>
    <dialog ref={dialog} aria-labelledby="task-title" onClose={() => addButton.current?.focus()}><form onSubmit={submit}><p className="eyebrow">Demonstração · sem salvamento</p><h2 id="task-title">Adicionar tarefa</h2><p>{formatCivil(selected, { day: 'numeric', month: 'long' })}</p><label>Título<input name="title" required maxLength={120} autoFocus onInput={event => event.currentTarget.setCustomValidity('')} /></label><label>Horário (opcional)<input name="time" type="time" /></label><label>Categoria<select name="category">{Object.entries(categories).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><div className="dialog-actions"><button type="button" onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary" type="submit">Adicionar ao exemplo</button></div></form></dialog>
  </>;
}

export default function Demo() {
  const today = useToday();
  const [solid, setSolid] = useState(false);
  const { pathname } = useLocation();
  const [activities, setActivities] = useState<DemoActivity[]>(() => [
    { id: 'study', title: 'Revisar o conteúdo da aula', date: today, time: '09:00', category: 'studies', done: false },
    { id: 'walk', title: 'Separar um tempo para caminhar', date: today, time: '17:30', category: 'health', done: false },
    { id: 'documents', title: 'Organizar os documentos', date: today, time: '', category: 'personal', done: false },
  ]);
  const agendaProps = { today, activities, onToggle: (id: string) => setActivities(previous => previous.map(activity => activity.id === id ? { ...activity, done: !activity.done } : activity)), onAdd: (activity: DemoActivity) => setActivities(previous => [...previous, activity]) };
  return <div className={`app-shell ${solid ? 'solid' : ''}`}><a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <aside className="sidebar"><Link className="brand" to="/demo/hoje" aria-label="Leve, Meu dia">leve<span>.</span></Link><p className="brand-caption">Agenda pessoal</p><nav aria-label="Navegação principal">{destinations.map(destination => <NavLink key={destination.path} to={`/demo/${destination.path}`}><Icon name={destination.icon} /><span>{destination.label}</span></NavLink>)}</nav><div className="sidebar-bottom"><Link to="/demo/configuracoes" className="profile-link"><Icon name="profile" /><span>Perfil de exemplo<small>Preferências</small></span></Link></div></aside>
    <div className="main-wrapper"><div className="demo-banner"><span><strong>Demonstração</strong> · Dados fictícios. Alterações são temporárias.</span><Link to="/entrar">Sair da demo</Link></div><div className="mobile-brand"><span className="brand">leve.</span><Link to="/demo/configuracoes" aria-label="Perfil e preferências"><Icon name="profile" /></Link></div>
    <main id="main-content" tabIndex={-1}><Routes><Route index element={<Navigate to="hoje" replace />} /><Route path="hoje" element={<Agenda key="day" calendar={false} {...agendaProps} />} /><Route path="calendario" element={<Agenda key="month" calendar {...agendaProps} />} /><Route path="notas" element={<Notes />} /><Route path="compras" element={<Shopping />} /><Route path="configuracoes" element={<><PageTitle title="Preferências" subtitle="Perfil de exemplo" /><section className="panel settings"><h2>Leitura e aparência</h2><label className="shopping-item"><input type="checkbox" checked={solid} onChange={event => setSolid(event.target.checked)} /><span>Reduzir transparência<small>Usar superfícies sólidas nesta demonstração.</small></span></label><p>Fuso deste navegador: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><p className="muted">Conta, cores personalizadas, notificações e preferências persistentes estarão disponíveis nas próximas etapas.</p></section></>} /><Route path="*" element={<><PageTitle title="Página não encontrada" subtitle="Demonstração" /><Link to="/demo/hoje">Voltar ao Meu dia</Link></>} /></Routes></main>
    <footer className="page-footer">Leve · Vidro & Papel <span>{pathname.includes('configuracoes') ? 'Preferências temporárias' : 'Base de interface · E01'}</span></footer></div>
  </div>;
}
