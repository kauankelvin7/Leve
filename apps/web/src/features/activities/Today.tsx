import { useEffect, useRef, useState, type FormEvent } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import type { Activity, Category } from '../../../../../packages/domain/src/content';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { firestore } from '../../platform/firebase';
import { sendCommand } from '../../platform/api';
import { useAuth } from '../identity/AuthProvider';
import { useUserCollection } from '../content/useUserCollection';

type StoredActivity = Activity & { id: string };

export function Today() {
  const { user, session } = useAuth();
  const [activities, setActivities] = useState<StoredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<'task' | 'event'>('task');
  const { items: categories } = useUserCollection<Category>('categories');
  const pending = useRef<CommandEnvelope | null>(null);
  useEffect(() => { document.title = 'Meu dia · Leve'; }, []);
  useEffect(() => {
    if (!user || !firestore) return;
    return onSnapshot(query(collection(firestore, `users/${user.uid}/activities`), limit(50)), snapshot => {
      setActivities(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StoredActivity)).filter(item => !item.deletedAt).sort((a, b) => (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt)));
      setLoading(false); setMessage('');
    }, () => { setLoading(false); setMessage('Não foi possível carregar suas atividades.'); });
  }, [user]);

  async function create(event: FormEvent<HTMLFormElement>) {
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
      : { type: 'event' as const, allDay: false as const, startDate: dueDate!, startTime: dueTime!, endDate: String(fields.get('endDate')), endTime: String(fields.get('endTime')), timeZone, disambiguation: 'reject' as const };
    const payload = { title, descriptionPlain: String(fields.get('description')).trim(), categoryId: String(fields.get('categoryId')) || null, schedule, reminderSpecs: [] };
    if (!pending.current || JSON.stringify(pending.current.payload) !== JSON.stringify(payload)) pending.current = { command: 'activity.create', operationId: crypto.randomUUID(), entityId: crypto.randomUUID(), expectedRevision: 0, payload, clientCreatedAt: new Date().toISOString() };
    setBusy(true); setMessage('');
    try { await sendCommand(pending.current); pending.current = null; form.reset(); setMessage('Atividade salva.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }

  async function trash(activity: StoredActivity) {
    if (busy) return; setBusy(true); setMessage('');
    try { await sendCommand({ command: 'activity.trash', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: {}, clientCreatedAt: new Date().toISOString() }); setMessage('Atividade movida para a lixeira.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível remover.'); } finally { setBusy(false); }
  }

  async function toggle(activity: StoredActivity) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await sendCommand({ command: 'activity.setStatus', operationId: crypto.randomUUID(), entityId: activity.id, expectedRevision: activity.revision, payload: { status: activity.status === 'completed' ? 'pending' : 'completed' }, clientCreatedAt: new Date().toISOString() }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar.'); }
    finally { setBusy(false); }
  }

  return <main><header className="page-heading"><p className="eyebrow">Sua agenda</p><h1 id="page-title" tabIndex={-1}>Meu dia</h1></header>
    <section className="panel activity-composer" aria-labelledby="new-activity"><h2 id="new-activity">Nova atividade</h2><form onSubmit={create}>
      <label>Tipo<select value={kind} onChange={event => { setKind(event.target.value as 'task' | 'event'); pending.current = null; }}><option value="task">Tarefa</option><option value="event">Compromisso</option></select></label>
      <label>Título<input name="title" required maxLength={120} onChange={() => { pending.current = null; }} /></label>
      <label>Categoria<select name="categoryId"><option value="">Sem categoria</option>{categories.filter(category => !category.archivedAt && !category.deletedAt).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Descrição<textarea name="description" maxLength={5000} rows={3} /></label>
      <div className="date-fields"><label>{kind === 'task' ? 'Data' : 'Início'}<input name="dueDate" type="date" required={kind === 'event'} /></label><label>Horário<input name="dueTime" type="time" required={kind === 'event'} /></label></div>
      {kind === 'event' ? <div className="date-fields"><label>Fim<input name="endDate" type="date" required /></label><label>Horário final<input name="endTime" type="time" required /></label></div> : null}
      <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Adicionar atividade'}</button>
    </form></section>
    <section className="real-activities" aria-labelledby="activity-title"><div className="section-heading"><h2 id="activity-title">Atividades</h2><span className="muted">{activities.length} {activities.length === 1 ? 'item' : 'itens'}</span></div>
      {loading ? <p role="status">Carregando…</p> : activities.length ? <ul>{activities.map(activity => <li key={activity.id}><div className="activity-manage"><label>{activity.kind === 'task' ? <input type="checkbox" checked={activity.status === 'completed'} disabled={busy} onChange={() => void toggle(activity)} /> : null}<span className={activity.status === 'completed' ? 'completed' : ''}><strong>{activity.title}</strong><small>{activity.schedule.type === 'task' ? activity.schedule.dueDate ? `${activity.schedule.dueDate}${activity.schedule.dueTime ? ` às ${activity.schedule.dueTime}` : ''}` : 'Sem prazo' : activity.schedule.allDay ? `${activity.schedule.startDate} · dia inteiro` : `${activity.schedule.startDate} · ${activity.schedule.startTime}–${activity.schedule.endTime}`}</small></span></label><button disabled={busy} onClick={() => void trash(activity)}>Excluir</button></div></li>)}</ul> : <div className="empty"><p>Sua agenda está vazia. Adicione a primeira atividade acima.</p></div>}
    </section><p role="status" className="form-status">{message}</p>
  </main>;
}
