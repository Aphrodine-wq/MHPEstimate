import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface ConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
  companyName: string | null;
}

function useIntegrationConnection(provider: string) {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false, connectedAt: null, companyName: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/${provider}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Treat as not connected
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { refresh(); }, [refresh]);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (res.ok) {
        setStatus({ connected: false, connectedAt: null, companyName: null });
        toast.success(`${provider} disconnected`);
      } else {
        toast.error("Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  }, [provider]);

  return { ...status, loading, refresh, disconnect };
}

export function QuickBooksConnect() {
  const { connected, loading, companyName, connectedAt, disconnect } = useIntegrationConnection("quickbooks");
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = () => {
    window.location.href = "/api/integrations/quickbooks/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--gray5)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--gray5)]" />
            <div className="h-2.5 w-40 animate-pulse rounded bg-[var(--gray5)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gray5)]">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2ca01c" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="3" width="20" height="18" rx="2" />
            <path d="M8 7v10M12 7v10M16 7v10" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-[var(--label)]">QuickBooks</p>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                connected
                  ? "bg-green-50 text-green-700"
                  : "bg-[var(--gray5)] text-[var(--gray2)]"
              }`}
            >
              {connected ? (
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="text-[11px] text-[var(--secondary)] truncate">
            {connected
              ? `${companyName || "QuickBooks"} · Connected ${connectedAt ? new Date(connectedAt).toLocaleDateString() : ""}`
              : "Sync estimates and invoices to QuickBooks Online"
            }
          </p>
        </div>
        <div className="flex-shrink-0">
          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-lg border border-[var(--sep)] px-3 py-1.5 text-[11px] font-medium text-[var(--secondary)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--label)] disabled:opacity-50"
            >
              {disconnecting ? "..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="rounded-lg bg-[#2ca01c] px-3.5 py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
