import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { Activity } from '../../../../../packages/domain/src/content';
import { Icon } from '../../components/ui/Icon';
import { sendCommand } from '../../platform/api';
import { useActiveTimeEntry, useUserDocument } from '../content/useUserCollection';
import { useAuth } from '../identity/AuthProvider';
import { timeEntrySeconds, timerClock } from './timeTracking';

export function ActiveTimerBar() {
  const { session } = useAuth();
  const { item: entry, error } = useActiveTimeEntry();
  const { item: activity } = useUserDocument<Activity>(entry ? `activities/${entry.activityId}` : '');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!entry || entry.paused) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [entry?.id, entry?.paused, entry?.startedAt]);

  useEffect(() => {
    document.documentElement.classList.toggle('has-active-timer', Boolean(entry));
    return () => document.documentElement.classList.remove('has-active-timer');
  }, [Boolean(entry)]);

  if (!entry && !error) return null;

  async function change(action: 'pause' | 'resume' | 'stop') {
    if (!entry || busy) return;
    setBusy(true); setMessage('');
    try {
      await sendCommand({
        command: `timeEntry.${action}`,
        operationId: crypto.randomUUID(),
        entityId: entry.id,
        expectedRevision: entry.revision,
        payload: {},
        clientCreatedAt: new Date().toISOString(),
      });
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar o cronômetro.');
    } finally { setBusy(false); }
  }

  if (!entry) return createPortal(
    <aside className="active-timer-error-bar" role="status"><strong>Não foi possível localizar o cronômetro.</strong><span>{error}</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></aside>,
    document.body,
  );

  const title = activity?.title ?? 'Atividade em andamento';
  const seconds = timeEntrySeconds(entry, now);
  return createPortal(
    <aside className={`active-timer-bar${entry.paused ? ' is-paused' : ''}${session?.profile?.reduceTransparency ? ' is-solid' : ''}`} aria-label={`Cronômetro de ${title}`} aria-live="polite">
      <div className="active-timer-state" aria-hidden="true"><span /><Icon name="clock" /></div>
      <Link className="active-timer-summary" to={`/atividade/${entry.activityId}#cronometro`}>
        <span className="active-timer-label">{entry.paused ? 'Cronômetro pausado' : 'Contando agora'}</span>
        <strong title={title}>{title}</strong>
      </Link>
      <time className="active-timer-clock" dateTime={`PT${seconds}S`}>{timerClock(seconds)}</time>
      <div className="active-timer-actions">
        <button className="active-timer-toggle" disabled={busy} onClick={() => void change(entry.paused ? 'resume' : 'pause')} aria-label={entry.paused ? 'Retomar cronômetro' : 'Pausar cronômetro'} title={entry.paused ? 'Retomar' : 'Pausar'}>
          <Icon name={entry.paused ? 'play' : 'pause'} />
        </button>
        <button disabled={busy} onClick={() => void change('stop')} aria-label="Encerrar cronômetro" title="Encerrar"><Icon name="stop" /></button>
        <Link className="active-timer-open" to={`/atividade/${entry.activityId}#cronometro`} aria-label={`Abrir cronômetro de ${title}`} title="Abrir atividade"><Icon name="chevronRight" /></Link>
      </div>
      {(error || message) && <p className="active-timer-error" role="status">{message || error}</p>}
    </aside>,
    document.body,
  );
}
