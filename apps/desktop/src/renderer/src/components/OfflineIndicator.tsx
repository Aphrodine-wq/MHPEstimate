import { useState, useEffect, useCallback } from "react";

interface SyncStatus {
  state: "idle" | "syncing" | "error" | "offline";
  pending: number;
  failed: number;
  lastSync: string | null;
  currentItem?: string;
  lastError?: string;
}

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for real-time sync status events from the engine
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.sync) return;

    // Get initial status
    api.sync.getStatus().then(setSyncStatus).catch(() => {});

    // Subscribe to live status updates
    const cleanup = api.sync.onSyncStatus((status: SyncStatus) => {
      setSyncStatus(status);
    });

    return cleanup;
  }, []);

  // Fallback: poll sync status every 10 seconds in case events are missed
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.sync) return;

    const interval = setInterval(() => {
      api.sync.getStatus().then(setSyncStatus).catch(() => {});
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  // Manual retry handler
  const handleRetry = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.sync || isRetrying) return;

    setIsRetrying(true);
    try {
      const result = await api.sync.trigger();
      setSyncStatus(result);
    } catch {
      // Sync trigger failed, status will update via events
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying]);

  // Format the last sync time for display
  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  };

  const state = syncStatus?.state ?? "idle";
  const pending = syncStatus?.pending ?? 0;
  const failed = syncStatus?.failed ?? 0;

  // Hide when online, fully synced, and no errors
  if (online && state === "idle" && pending === 0 && failed === 0) {
    return null;
  }

  // Determine visual style based on state
  const getStyles = () => {
    if (!online || state === "offline") {
      return {
        container: "bg-[var(--red)]/10 text-[var(--red)]",
        dot: "bg-[var(--red)] animate-pulse",
      };
    }
    if (state === "error" || failed > 0) {
      return {
        container: "bg-[var(--red)]/10 text-[var(--red)]",
        dot: "bg-[var(--red)]",
      };
    }
    if (state === "syncing" || pending > 0) {
      return {
        container: "bg-[var(--orange)]/10 text-[var(--orange)]",
        dot: "bg-[var(--orange)] animate-pulse",
      };
    }
    return {
      container: "bg-[var(--green)]/10 text-[var(--green)]",
      dot: "bg-[var(--green)]",
    };
  };

  const styles = getStyles();

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium ${styles.container}`}
    >
      {/* Status dot */}
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${styles.dot}`} />

      {/* Status text */}
      <div className="flex items-center gap-2">
        {(!online || state === "offline") && (
          <span>Offline — changes saved locally</span>
        )}

        {online && state === "syncing" && (
          <span>
            {syncStatus?.currentItem ?? `Syncing ${pending} change${pending !== 1 ? "s" : ""}...`}
          </span>
        )}

        {online && state === "idle" && pending > 0 && (
          <span>
            {pending} pending change{pending !== 1 ? "s" : ""}
          </span>
        )}

        {online && state === "error" && (
          <span>{syncStatus?.lastError ?? "Sync error"}</span>
        )}

        {online && failed > 0 && state !== "error" && (
          <span>
            {failed} failed sync{failed !== 1 ? "s" : ""}
          </span>
        )}

        {/* Last sync timestamp */}
        {syncStatus?.lastSync && state !== "syncing" && state !== "offline" && (
          <span className="opacity-60">
            · Last sync: {formatLastSync(syncStatus.lastSync)}
          </span>
        )}

        {/* Retry button for errors */}
        {online && (state === "error" || failed > 0) && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-semibold opacity-80 hover:opacity-100 transition-opacity disabled:opacity-40"
            style={{
              background: "currentColor",
              color: "white",
              mixBlendMode: "normal",
            }}
          >
            <span style={{ color: "white", mixBlendMode: "normal" }}>
              {isRetrying ? "Retrying..." : "Retry"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
