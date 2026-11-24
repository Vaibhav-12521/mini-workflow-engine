import { useEffect, useRef } from 'react';
import { Banner, Button } from './ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation. Uses the native <dialog> element:
 * showModal() gives a real focus trap, Esc-to-close and an inert background for free.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc → let React state drive closing
        if (!busy) onCancel();
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog__body">{children}</div>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="dialog__actions">
        <Button variant="ghost" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
