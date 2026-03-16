import { useState, useEffect } from "react";

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const cleanup = window.electronAPI?.onUpdateStatus((status) => {
      setUpdate(status);
      if (status.status === "available" || status.status === "downloaded") {
        setDismissed(false);
      }
    });
    return () => { cleanup?.(); };
  }, []);

  if (!update || dismissed) return null;

  // Only show for actionable states
  if (update.status === "checking" || update.status === "not-available" || update.status === "error") {
    return null;
  }

  const version = update.info?.version ?? "new version";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-2 text-[13px]">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>

        {update.status === "available" && (
          <span>
            Update <strong>v{version}</strong> is available.
          </span>
        )}
        {update.status === "downloading" && (
          <span>
            Downloading update… {update.progress?.percent ?? 0}%
          </span>
        )}
        {update.status === "downloaded" && (
          <span>
            Update <strong>v{version}</strong> is ready to install.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {update.status === "available" && (
          <button
            onClick={() => window.electronAPI?.downloadUpdate()}
            className="rounded-md bg-[var(--accent)] px-3 py-1 text-[12px] font-semibold text-white hover:brightness-110 transition-all"
          >
            Download
          </button>
        )}
        {update.status === "downloading" && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--accent)]/20">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${update.progress?.percent ?? 0}%` }}
            />
          </div>
        )}
        {update.status === "downloaded" && (
          <button
            onClick={() => window.electronAPI?.installUpdate()}
            className="rounded-md bg-[var(--green)] px-3 py-1 text-[12px] font-semibold text-white hover:brightness-110 transition-all"
          >
            Restart & Install
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-[var(--secondary)] hover:bg-[var(--bg)] hover:text-[var(--label)]"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
