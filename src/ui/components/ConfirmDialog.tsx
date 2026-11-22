import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  titleId: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  titleId,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      titleId={titleId}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-text-muted">{description}</div>
    </Dialog>
  );
}
