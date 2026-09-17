import { useEffect, useId, useRef } from 'react';
import type { CalendarMutationScope } from './calendarCommandModel';

type RecurrenceScopeDialogProps = {
  open: boolean;
  activityTitle: string;
  busy?: boolean;
  onSelect: (scope: CalendarMutationScope) => void;
  onCancel: () => void;
};

export function RecurrenceScopeDialog({
  open,
  activityTitle,
  busy = false,
  onSelect,
  onCancel,
}: RecurrenceScopeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="calendar-recurrence-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClose={() => {
        if (open && !busy) onCancel();
      }}
    >
      <div className="calendar-recurrence-dialog-content">
        <p className="eyebrow">Compromisso recorrente</p>
        <h2 id={titleId}>Qual parte da repetição deve mudar?</h2>
        <p id={descriptionId}>
          <strong>{activityTitle}</strong> faz parte de uma série. Escolha o alcance antes de aplicar a alteração de horário.
        </p>

        <div className="calendar-recurrence-options">
          <button
            type="button"
            className="primary"
            disabled={busy}
            autoFocus
            onClick={() => onSelect('occurrence')}
          >
            Somente esta ocorrência
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelect('future')}
          >
            Esta e as próximas
          </button>
        </div>

        <button type="button" className="calendar-recurrence-cancel" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
