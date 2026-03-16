import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface PaymentStatusProps {
  estimateId: string;
  estimateNumber: string;
  grandTotal: number;
  compact?: boolean;
}

type PaymentState = "loading" | "not_configured" | "unpaid" | "pending" | "paid" | "error";

export function PaymentStatus({ estimateId, estimateNumber, grandTotal, compact }: PaymentStatusProps) {
  const [state, setState] = useState<PaymentState>("loading");
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/payment-link`);
      const data = await res.json();

      if (!data.configured) {
        setState("not_configured");
        return;
      }

      if (data.status === "paid") {
        setState("paid");
        setPaidAmount(data.amount);
        setPaidAt(data.paidAt);
      } else if (data.status === "pending") {
        setState("pending");
      } else {
        setState("unpaid");
      }
    } catch {
      setState("error");
    }
  }, [estimateId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/payment-link`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create payment link");
        return;
      }

      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success("Payment link copied to clipboard");
        setState("pending");
      }
    } catch {
      toast.error("Failed to create payment link");
    } finally {
      setCreating(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (state === "loading") {
    return compact ? null : (
      <div className="flex items-center gap-2 text-[12px] text-[var(--secondary)]">
        <div className="h-3 w-3 animate-spin rounded-full border border-[var(--gray4)] border-t-[var(--accent)]" />
        Checking payment...
      </div>
    );
  }

  if (state === "not_configured") {
    return compact ? null : (
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        Stripe not configured
      </div>
    );
  }

  if (state === "paid") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "rounded-lg border border-green-200 bg-green-50 px-3 py-2"}`}>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--green)]">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-green-800">
            Paid {paidAmount !== null ? fmt(paidAmount) : ""}
          </p>
          {!compact && paidAt && (
            <p className="text-[10px] text-green-600">
              {new Date(paidAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"}`}>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-medium text-blue-800">Payment link sent</p>
          {!compact && (
            <p className="text-[10px] text-blue-600">Awaiting {fmt(grandTotal)}</p>
          )}
        </div>
        <button
          onClick={handleCreateLink}
          disabled={creating}
          className="rounded-md border border-blue-200 px-2 py-1 text-[10px] font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          Resend
        </button>
      </div>
    );
  }

  // unpaid / error
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
      <button
        onClick={handleCreateLink}
        disabled={creating}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--sep)] px-3 py-2 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <path d="M1 10h22" />
        </svg>
        {creating ? "Creating..." : "Send Payment Link"}
      </button>
    </div>
  );
}
