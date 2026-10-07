import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import styles from './ColorPicker.module.css';

type Option = { value: string; label: string; color?: string };

/** A compact form control; the modal lives outside the form and uses native
 * dialog focus trapping, Escape and inert background semantics. */
export function ColorPicker({ label, name, value, options, onChange }: {
  label: string; name: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const current = options.find(option => option.value === value) ?? { value, label: 'Cor personalizada', color: value };
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    selected.current?.focus();
    return () => { trigger.current?.focus({ preventScroll: true }); };
  }, [open]);
  return <div className={styles.field}>
    <span id={`${titleId}-label`} className={styles.label}>{label}</span>
    <input type="hidden" name={name} value={value} />
    <button ref={trigger} type="button" className={styles.trigger} aria-labelledby={`${titleId}-label ${titleId}-value`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span className={styles.swatch} style={{ backgroundColor: current.color }} aria-hidden="true" /><span id={`${titleId}-value`}>{current.label}</span><Icon name="chevronDown" />
    </button>
    {open && createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
    }}>
      <header className={styles.header}><div><p>Do seu jeito</p><h2 id={titleId}>{label}</h2></div><button type="button" className="icon-button" aria-label="Fechar cores" onClick={() => setOpen(false)}><Icon name="close" /></button></header>
      <div className={styles.options} role="group" aria-label={label}>{options.map(option => <button type="button" key={option.value} ref={option.value === value ? selected : undefined} aria-pressed={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }}>
        <span className={styles.swatch} style={{ backgroundColor: option.color }} aria-hidden="true" /><span>{option.label}</span>{option.value === value && <Icon name="check" />}
      </button>)}</div>
    </dialog>, document.body)}
  </div>;
}
