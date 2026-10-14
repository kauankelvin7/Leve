import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { PendingCommand } from '../../platform/outbox';
import { outboxRecoveryText, outboxRecoveryTitle } from '../../platform/outboxRecovery';
import styles from './OutboxRecovery.module.css';

export function OutboxRecovery({ entries, onRemove, onClose }: { entries: PendingCommand[]; onRemove: (entry: PendingCommand) => Promise<void>; onClose: () => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmation = useRef<HTMLDivElement>(null);
  async function remove(entry: PendingCommand) {
    if (!acknowledged || busy) return;
    setBusy(true); setError('');
    try { await onRemove(entry); setConfirmId(null); setAcknowledged(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível remover. O conteúdo continua neste aparelho.'); }
    finally { setBusy(false); }
  }
  return <ConfirmDialog title="Alterações neste aparelho" onClose={() => { if (!busy) onClose(); }}>
    <div className={styles.content}>
      <p>Leia e copie o que quiser recuperar. Esta tela não envia as alterações nem muda a versão que elas esperavam encontrar.</p>
      {entries.map(entry => <article key={entry.key} className={styles.entry}>
        <h3>{outboxRecoveryTitle(entry.command)}</h3>
        <p>Guardada em {new Date(entry.createdAt).toLocaleString('pt-BR')}.</p>
        <label>Conteúdo para copiar<textarea className={styles.payload} readOnly rows={6} value={outboxRecoveryText(entry.command)} onFocus={event => event.currentTarget.select()} /></label>
        {confirmId === entry.operationId ? <div ref={confirmation} className={styles.confirmation} role="group" aria-label="Confirmar remoção da pendência">
          <p>A alteração sairá da fila deste aparelho e não será enviada. Copie ou recupere o conteúdo antes de continuar.</p>
          <label><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} /> Já copiei ou recuperei o que preciso</label>
          <div className="dialog-actions"><button type="button" disabled={!acknowledged || busy} onClick={() => void remove(entry)}>Confirmar remoção</button><button type="button" disabled={busy} onClick={() => { setConfirmId(null); setAcknowledged(false); }}>Cancelar</button></div>
        </div> : <button type="button" disabled={busy} onClick={() => { setConfirmId(entry.operationId); setAcknowledged(false); }}>Remover esta pendência</button>}
      </article>)}
      {!entries.length ? <p>Não há alterações pendentes nesta conta.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
    <div className="dialog-actions"><button type="button" disabled={busy} onClick={onClose}>Fechar</button></div>
  </ConfirmDialog>;
}
