import { PaymentStatus } from "../PaymentStatus";
import { QuickBooksExport } from "../QuickBooksExport";

const btnClass =
  "rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg)] disabled:opacity-50";

const accentBtnClass =
  "rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50";

const greenBtnClass =
  "rounded-lg bg-[var(--green)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50";

export interface EditorFooterProps {
  estimateId: string;
  estimateNumber: string;
  status: string;
  lineCount: number;
  categoryLabel: string;
  grandTotal: number;
  isAdmin: boolean;
  saving: boolean;
  generatingPdf: boolean;
  sending: boolean;
  submitting: boolean;
  approving: boolean;
  validating: boolean;
  onSaveDraft: () => void;
  onSubmitForReview: () => void;
  onRequestRevision: () => void;
  onApprove: () => void;
  onSendToClient: () => void;
  onDownloadPDF: () => void;
  onRunValidation: () => void;
  onClose: () => void;
}

export function EditorFooter({
  estimateId,
  estimateNumber,
  status,
  lineCount,
  categoryLabel,
  grandTotal,
  isAdmin,
  saving,
  generatingPdf,
  sending,
  submitting,
  approving,
  validating,
  onSaveDraft,
  onSubmitForReview,
  onRequestRevision,
  onApprove,
  onSendToClient,
  onDownloadPDF,
  onRunValidation,
  onClose,
}: EditorFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--sep)] px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-[var(--tertiary)]">
          {lineCount} line item{lineCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-[var(--tertiary)]">&middot;</span>
        <span className="text-[11px] font-medium text-[var(--secondary)]">{categoryLabel}</span>
        {/* Payment status for sent/approved/accepted estimates */}
        {["sent", "approved", "accepted"].includes(status) && (
          <PaymentStatus
            estimateId={estimateId}
            estimateNumber={estimateNumber}
            grandTotal={grandTotal}
            compact
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Always available */}
        <button type="button" onClick={onDownloadPDF} disabled={generatingPdf} className={btnClass}>
          {generatingPdf ? "Generating\u2026" : "Download PDF"}
        </button>
        <QuickBooksExport estimateId={estimateId} estimateNumber={estimateNumber} />
        <button type="button" onClick={onRunValidation} disabled={validating} className={btnClass}>
          {validating ? "Validating\u2026" : "Run Validation"}
        </button>
        <button type="button" onClick={onClose} className={btnClass}>
          Cancel
        </button>

        {/* Draft: save or submit for review */}
        {status === "draft" && (
          <>
            <button type="button" disabled={saving} onClick={onSaveDraft} className={btnClass}>
              {saving ? "Saving\u2026" : "Save Draft"}
            </button>
            <button type="button" disabled={submitting} onClick={onSubmitForReview} className={accentBtnClass}>
              {submitting ? "Submitting\u2026" : "Submit for Review"}
            </button>
          </>
        )}

        {/* In Review: save, kick back, or approve (admin only) */}
        {status === "in_review" && (
          <>
            <button type="button" disabled={saving} onClick={onSaveDraft} className={btnClass}>
              {saving ? "Saving\u2026" : "Save Changes"}
            </button>
            <button type="button" onClick={onRequestRevision} className={btnClass}>
              Return to Draft
            </button>
            {isAdmin && (
              <button type="button" disabled={approving} onClick={onApprove} className={greenBtnClass}>
                {approving ? "Approving\u2026" : "Approve Estimate"}
              </button>
            )}
          </>
        )}

        {/* Approved: save or send */}
        {status === "approved" && (
          <>
            <button type="button" disabled={saving} onClick={onSaveDraft} className={btnClass}>
              {saving ? "Saving\u2026" : "Save Changes"}
            </button>
            <button type="button" disabled={sending} onClick={onSendToClient} className={accentBtnClass}>
              {sending ? "Sending\u2026" : "Send to Client"}
            </button>
          </>
        )}

        {/* Sent / Accepted / Declined / Expired: save only */}
        {["sent", "accepted", "declined", "expired"].includes(status) && (
          <button type="button" disabled={saving} onClick={onSaveDraft} className={btnClass}>
            {saving ? "Saving\u2026" : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
