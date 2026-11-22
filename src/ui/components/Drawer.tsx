import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  title: string;
  titleId: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** A modal sheet anchored to the right. Below 480px it fills the screen. */
export function Drawer({
  open,
  title,
  titleId,
  description,
  onClose,
  children,
  footer,
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const field = dialog.querySelector<HTMLElement>("input, select, textarea");
      (field ?? dialog.querySelector<HTMLElement>("button"))?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="panel-surface m-0 ml-auto h-dvh max-h-none w-full max-w-[480px] rounded-none bg-surface-1 p-0 text-text open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate font-serif text-[28px] leading-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
