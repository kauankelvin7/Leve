import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type Props = { open: boolean; onClose: () => void; children: ReactNode };

export function CalendarDaySheet({ open, onClose, children }: Props) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 739px)').matches);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 739px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [mobile, open]);

  const className = `calendar-agenda glass glass-strong${open ? ' open' : ''}`;
  if (!mobile) return <section className={className} aria-labelledby="selected-date">{children}</section>;
  return <dialog ref={dialog} className={className} aria-labelledby="selected-date"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }}>
    {children}
  </dialog>;
}
