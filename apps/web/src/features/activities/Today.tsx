import { useEffect, useRef, useState, type FormEvent } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import type { Activity, Category, Note, ShoppingList } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { firestore } from '../../platform/firebase';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection } from '../content/useUserCollection';

import { Link, useSearchParams } from 'react-router-dom';
import { Temporal } from '@js-temporal/polyfill';
import { DayNavigation, useCurrentDay } from './DayNavigation';

type StoredActivity = Activity & { id: string };

function describe(activity: StoredActivity) {
  if (activity.schedule.type === 'task') return activity.schedule.dueDate ? `${activity.schedule.dueDate}${activity.schedule.dueTime ? ` as ${activity.schedule.dueTime}` : ''}` : 'Sem prazo';
  return activity.schedule.allDay ? `${activity.schedule.startDate} - dia inteiro` : `${activity.schedule.startDate} - ${activity.schedule.startTime}-${activity.schedule.endTime}`;
}

function timedEvent(activity: StoredActivity | null) {
  return activity?.schedule.type === 'event' && !activity.schedule.allDay ? activity.schedule : null;
}

export function Today() {
  const { user, session } = useAuth();
  const today = useCurrentDay(session!.profile!.timeZone);
  const [searchParams] = useSearchParams();
  const [chosenDay, setChosenDay] = useState<string | null>(() => { try { const day = searchParams.get('dia'); return day ? Temporal.PlainDate.from(day).toString() : null; } catch { return null; } });
  const selectedDay = chosenDay ?? today;
  const [composerOpen, setComposerOpen] = useState(searchParams.get('nova') === '1');
  const { items: notes, error: noteError } = useUserCollection<Note>('notes');
  const { items: shoppingLists, error: shoppingError } = useUserCollection<ShoppingList>('shoppingLists');
  const pinnedNote = notes
    .filter(note => note.pinned && !note.deletedAt)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const activeShoppingLists = shoppingLists.filter(list => !list.deletedAt && !list.archivedAt && list.listKind !== 'template');
  const pendingShoppingItems = activeShoppingLists.reduce((total, list) => total + (list.pendingItemCount ?? list.itemCount), 0);
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'task' | 'event'>('task');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('none');
  const [editScope, setEditScope] = useState<'occurrence' | 'future'>('occurrence');
  const [editing, setEditing] = useState<StoredActivity | null>(null);
  const { items: categories } = useUserCollection<Category>('categories');
  const pending = useRef<CommandEnvelope | null>(null);
  const futureSeriesId = useRef('');
  const editingEvent = timedEvent(editing);
  useEffect(() => { document.title = 'Meu dia - Leve'; }, []);
  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);
    const root = collection(firestore, `users/${user.uid}/activities`);
    const groups: StoredActivity[][] = [[], [], [], [], []];
    const ready = new Set<number>();
    const queries = [
      query(root, where('schedule.dueDate', '==', selectedDay), limit(50)),
      query(root, where('schedule.dueDate', '==', null), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDate', '>=', selectedDay), limit(50)),
      query(root, where('schedule.startDate', '<=', selectedDay), where('schedule.endDateExclusive', '>=', selectedDay), limit(50)),
      query(root, where('schedule.dueDate', '<', selectedDay), limit(50)),
    ];
    const stops = queries.map((target, index) => onSnapshot(target, snapshot => {
      groups[index] = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StoredActivity));
      ready.add(index);
      setActivities(groups.flat().filter((item, position, all) => !item.deletedAt
        && all.findIndex(candidate => candidate.id === item.id) === position
        && (item.schedule.type !== 'event' || !item.schedule.allDay || selectedDay < item.schedule.endDateExclusive)
        && (item.schedule.type !== 'task' || item.schedule.dueDate !== null || selectedDay === today)
        && (item.schedule.type !== 'task' || !item.schedule.dueDate || item.schedule.dueDate >= selectedDay || (selectedDay === today && item.status === 'pending')))
        .sort((left, right) => (left.dueAt ?? left.createdAt).localeCompare(right.dueAt ?? right.createdAt)));
      setLoading(ready.size !== queries.length);
    }, () => { setLoading(false); setMessage('Não foi possível carregar suas atividades.'); }));
    return () => stops.forEach(stop => stop());
  }, [user, selectedDay, today]);

  function startEdit(activity: StoredActivity) {
    setComposerOpen(true);
    setEditing(activity);
    setKind(activity.schedule.type);
    setEventAllDay(activity.schedule.type === 'event' && activity.schedule.allDay);
    pending.current = null;
    futureSeriesId.current = crypto.randomUUID();
    setEditScope('occurrence');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = String(fields.get('title')).trim();
    const dueDate = String(fields.get('dueDate')) || null;
    const dueTime = String(fields.get('dueTime')) || null;
    const timeZone = session!.profile!.timeZone;
    const schedule = kind === 'task'
      ? { type: 'task' as const, dueDate, dueTime, timeZone, disambiguation: 'reject' as const }
      : eventAllDay
        ? { type: 'event' as const, allDay: true as const, startDate: dueDate!, endDateExclusive: String(fields.get('endDateExclusive')), timeZone }
        : { type: 'event' as const, allDay: false as const, startDate: dueDate!, startTime: dueTime!, endDate: String(fields.get('endDate')), endTime: String(fields.get('endTime')), timeZone, disambiguation: 'reject' as const };
    const reminderSpecs = fields.getAll('reminders').map(value => ({ id: `before-${value}`, minutesBefore: Number(value) }));
    const activity = { title, descriptionPlain: String(fields.get('description')).trim(), categoryId: String(fields.get('categoryId')) || null, schedule, reminderSpecs };
    const recurring = !editing && recurrenceFrequency !== 'none';
    const future = Boolean(editing?.seriesId) && editScope === 'future';
    const payload = recurring ? { activity, recurrence: { frequency: recurrenceFrequency, interval: Number(fields.get('recurrenceInterval')) || 1, until: String(fields.get('recurrenceUntil')) || null, count: null, monthlyPolicy: String(fields.get('monthlyPolicy')) || 'lastDay' } } : future ? { activity, newSeriesId: futureSeriesId.current } : activity;
    const command = editing ? future ? 'activity.updateFuture' : 'activity.update' : recurring ? 'activity.createSeries' : 'activity.create';
    const entityId = editing?.id ?? crypto.randomUUID();
    const expectedRevision = editing?.revision ?? 0;
    if (!pending.current || pending.current.command !== command || pending.current.entityId !== entityId || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) {
      pending.current = { command, operationId: crypto.randomUUID(), entityId, expectedRevision, payload, clientCreatedAt: new Date().toISOString() };
    }
    setBusy(true); setMessage('');
    try {
      await sendCommand(pending.current);
      pending.current = null;
      setEditing(null);
      setComposerOpen(false);
      setKind('task');
      setEventAllDay(false);
      setRecurrenceFrequency('none');
      setEditScope('occurrence');
      form.reset();
      setMessage(editing ? 'Atividade atualizada.' : 'Atividade salva.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar. Seu rascunho foi preservado.');
    } finally {
      setBusy(false);
    }
  }

  async function trash(activity: StoredActivity) {
    if (busy) return; setBusy(true); setMessage('');
    try { await sendCommand({ command: 'activity.trash', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: {}, clientCreatedAt: new Date().toISOString() }); setMessage('Atividade movida para a lixeira.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nao foi possivel remover.'); } finally { setBusy(false); }
  }

  async function toggle(activity: StoredActivity) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: activity.status === 'completed' ? 'pending' : 'completed' }, clientCreatedAt: new Date().toISOString() }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Nao foi possivel atualizar.'); }
    finally { setBusy(false); }
  }

  return <main><header className="page-heading"><p className="eyebrow">Sua agenda</p><h1 id="page-title" tabIndex={-1}>Meu dia</h1><p>Olá, {session!.profile!.displayName}.</p><button className="primary" onClick={() => setComposerOpen(true)}>Nova atividade</button></header><div className="agenda-layout"><div><section className="panel"><DayNavigation selected={selectedDay} today={today} weekStartsOn={session!.profile!.weekStartsOn} onSelect={setChosenDay} /><div className="section-heading"><strong>{Temporal.PlainDate.from(selectedDay).toLocaleString('pt-BR', { day: 'numeric', month: 'long' })}</strong><span className="count-badge">{activities.filter(activity => activity.status === 'pending').length} pendentes</span></div></section>
    {composerOpen && <section className="panel activity-composer" aria-labelledby="new-activity"><h2 id="new-activity">{editing ? 'Editar atividade' : 'Nova atividade'}</h2><form key={editing?.id ?? 'new'} onSubmit={save}>
      <label>Tipo<select value={kind} onChange={event => { setKind(event.target.value as 'task' | 'event'); setEventAllDay(false); pending.current = null; }}><option value="task">Tarefa</option><option value="event">Compromisso</option></select></label>
      <label>Título<input aria-label="Título" name="title" required maxLength={120} defaultValue={editing?.title ?? ''} onChange={() => { pending.current = null; }} /></label>
      <label>Categoria<select name="categoryId" defaultValue={editing?.categoryId ?? ''}><option value="">Sem categoria</option>{categories.filter(category => !category.archivedAt && !category.deletedAt).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Descrição<textarea aria-label="Descrição" name="description" maxLength={5000} rows={3} defaultValue={editing?.descriptionPlain ?? ''} /></label>
      {kind === 'event' ? <label className="check-label"><input type="checkbox" checked={eventAllDay} onChange={event => setEventAllDay(event.target.checked)} /> Compromisso de dia inteiro</label> : null}
      <div className="date-fields"><label>{kind === 'task' ? 'Data' : 'Início'}<input aria-label={kind === 'task' ? 'Data' : 'Início'} name="dueDate" type="date" required={kind === 'event'} defaultValue={editing?.schedule.type === 'task' ? editing.schedule.dueDate ?? '' : editing?.schedule.type === 'event' ? editing.schedule.startDate : selectedDay} /></label>{kind === 'task' || !eventAllDay ? <label>Horário<input aria-label="Horário" name="dueTime" type="time" required={kind === 'event'} defaultValue={editing?.schedule.type === 'task' ? editing.schedule.dueTime ?? '' : editingEvent?.startTime ?? ''} /></label> : null}</div>
      {kind === 'event' && eventAllDay ? <label>Fim (dia seguinte ao último dia)<input name="endDateExclusive" type="date" required defaultValue={editing?.schedule.type === 'event' && editing.schedule.allDay ? editing.schedule.endDateExclusive : ''} /></label> : kind === 'event' ? <div className="date-fields"><label>Fim<input name="endDate" type="date" required defaultValue={editingEvent?.endDate ?? ''} /></label><label>Horário final<input aria-label="Horário final" name="endTime" type="time" required defaultValue={editingEvent?.endTime ?? ''} /></label></div> : null}
      <fieldset><legend>Lembretes</legend><label className="check-label"><input type="checkbox" name="reminders" value="30" defaultChecked={editing?.reminderSpecs.some(item => item.minutesBefore === 30)} /> 30 minutos antes</label><label className="check-label"><input type="checkbox" name="reminders" value="60" defaultChecked={editing?.reminderSpecs.some(item => item.minutesBefore === 60)} /> 1 hora antes</label><label className="check-label"><input type="checkbox" name="reminders" value="1440" defaultChecked={editing?.reminderSpecs.some(item => item.minutesBefore === 1440)} /> 1 dia antes</label></fieldset>
      {!editing ? <fieldset><legend>Repetição</legend><label>Frequência<select value={recurrenceFrequency} onChange={event => setRecurrenceFrequency(event.target.value)}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>{recurrenceFrequency !== 'none' ? <><div className="date-fields"><label>Repetir a cada<input name="recurrenceInterval" type="number" min="1" max="30" defaultValue="1" /></label><label>Até (opcional)<input name="recurrenceUntil" type="date" min={selectedDay} /></label></div>{recurrenceFrequency === 'monthly' ? <label>Quando o dia não existir<select name="monthlyPolicy" defaultValue="lastDay"><option value="lastDay">Usar o último dia do mês</option><option value="skip">Pular aquele mês</option></select></label> : null}<small>Sem data final, o Leve prepara as próximas 180 ocorrências.</small></> : null}</fieldset> : editing?.seriesId ? <fieldset><legend>Aplicar alteração</legend><label className="check-label"><input type="radio" name="editScope" checked={editScope === 'occurrence'} onChange={() => setEditScope('occurrence')} /> Somente esta ocorrência</label><label className="check-label"><input type="radio" name="editScope" checked={editScope === 'future'} onChange={() => setEditScope('future')} /> Esta e as futuras</label></fieldset> : null}
      <div className="dialog-actions"><button className="primary" disabled={busy}>{busy ? 'Salvando...' : editing ? 'Atualizar atividade' : 'Adicionar atividade'}</button>{editing ? <button type="button" disabled={busy} onClick={() => { setEditing(null); setKind('task'); pending.current = null; }}>Cancelar</button> : null}</div>
    </form></section>}
    <section className="real-activities" aria-labelledby="activity-title"><div className="section-heading"><h2 id="activity-title">Atividades</h2><span className="muted">{activities.length} {activities.length === 1 ? 'item' : 'itens'}</span></div>
      {loading ? <p role="status">Carregando...</p> : activities.length ? <ul>{activities.map(activity => <li key={activity.id} style={{ borderLeft: `5px solid ${categories.find(category => category.id === activity.categoryId)?.colorHex ?? '#ddd'}` }}><div className="activity-manage"><label>{activity.kind === 'task' ? <input type="checkbox" checked={activity.status === 'completed'} disabled={busy} onChange={() => void toggle(activity)} /> : null}<span className={activity.status === 'completed' ? 'completed' : ''}><strong>{activity.title}</strong><small>{describe(activity)} · {categories.find(category => category.id === activity.categoryId)?.name ?? 'Sem categoria'}</small></span></label><div className="row-actions"><button disabled={busy} onClick={() => startEdit(activity)}>Editar</button><button disabled={busy} onClick={() => void trash(activity)}>Excluir</button></div></div></li>)}</ul> : <div className="empty"><p>Nenhuma atividade neste dia. Use Nova atividade para adicionar.</p></div>}
    </section></div><aside className="agenda-aside"><section className="panel"><DayNavigation month selected={selectedDay} today={today} weekStartsOn={session!.profile!.weekStartsOn} onSelect={setChosenDay} /></section><article className={`note ${pinnedNote?.paperColorPreset ?? 'butter'}`}><p className="note-kicker">Fixada no Meu dia</p><h2>{pinnedNote?.title ?? 'Uma nota para lembrar'}</h2><p>{pinnedNote?.plainText ?? 'Fixe uma nota para consultá-la aqui.'}</p><Link to="/notas">Abrir notas</Link></article><Link className="panel shopping-summary" to="/compras"><strong>Compras</strong><span>{pendingShoppingItems} {pendingShoppingItems === 1 ? 'item pendente' : 'itens pendentes'} em {activeShoppingLists.length} {activeShoppingLists.length === 1 ? 'lista' : 'listas'}</span></Link></aside></div><p role="status" className="form-status">{message || noteError || shoppingError}</p>
  </main>;
}
