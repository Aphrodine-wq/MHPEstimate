import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Width class, default "w-full max-w-[480px]". Responsive: use "w-full max-w-[480px]" pattern. */
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "w-full max-w-[560px]",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;

  // Capture the element that triggered the modal so we can return focus on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  // Focus the first focusable element when modal opens
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    // Small delay to ensure the dialog is rendered
    requestAnimationFrame(() => {
      if (!dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstEl = focusable[0];
      if (firstEl) {
        firstEl.focus();
      }
    });
  }, [open]);

  // Focus trap + Escape to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[6px] animate-modal-overlay p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className={`${width} max-h-[85vh] overflow-hidden rounded-2xl border border-[var(--sep)] bg-[var(--card)] shadow-2xl animate-modal-content`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--sep)] px-6 py-5">
          <div>
            <h2 id={titleId} className="text-[18px] font-bold" style={{ letterSpacing: "-0.025em" }}>
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] text-[var(--secondary)]">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="mt-0.5 rounded-md p-1 transition-colors hover:bg-[var(--bg)]"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--gray1)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="max-h-[calc(85vh-130px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* -- Confirm Dialog -- */

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="w-full max-w-[380px]">
      <div className="px-6 py-4">
        <p className="text-[13px] leading-relaxed text-[var(--secondary)]">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] ${
            destructive ? "bg-[var(--red)]" : "bg-[var(--accent)]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* -- Field helpers (used in form modals) -- */

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all shadow-sm shadow-black/[0.02]";

export const selectClass =
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all appearance-none shadow-sm shadow-black/[0.02] cursor-pointer";

export const textareaClass =
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none shadow-sm shadow-black/[0.02]";
