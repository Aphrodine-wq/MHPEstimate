import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Width class, default "w-[480px]" */
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "w-[480px]",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[6px] animate-modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`${width} max-h-[85vh] overflow-hidden rounded-2xl border border-[var(--sep)] bg-[var(--card)] shadow-2xl animate-modal-content`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--sep)] px-6 py-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12px] text-[var(--secondary)]">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
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

/* ── Confirm Dialog ── */

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
    <Modal open={open} onClose={onClose} title={title} width="w-[380px]">
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

/* ── Field helpers (used in form modals) ── */

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
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-colors";

export const selectClass =
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-colors appearance-none";

export const textareaClass =
  "w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-colors resize-none";
