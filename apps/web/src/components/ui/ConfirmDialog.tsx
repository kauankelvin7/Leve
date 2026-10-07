import { useEffect, useRef, type ReactNode } from 'react';
export function ConfirmDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className="confirm-dialog glass glass-strong" aria-labelledby="confirm-title" onCancel={event => { event.preventDefault(); onClose(); }}><h2 id="confirm-title">{title}</h2>{children}</dialog>;
}
