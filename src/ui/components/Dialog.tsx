import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  title: string;
  titleId: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Native <dialog> as a modal: the browser provides focus trapping, Escape and the top layer. */
export function Dialog({
  open,
  title,
  titleId,
  description,
  onClose,
  children,
  footer,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const descriptionId = `${titleId}-description`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="panel-surface m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden bg-surface-1 p-0 text-text open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 pt-5 pb-4">
        <div>
          <h2 id={titleId} className="font-serif text-[28px] leading-tight">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
