import { useState, lazy, Suspense } from "react";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? "";
const AGENT_CONFIGURED = AGENT_ID.length > 0;

const LazyCallAlexPanel = lazy(() => import("./CallAlexPanel"));

export function CallAlexFAB({ onCall }: { onCall: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!AGENT_CONFIGURED) return null;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-5 shadow-md transition-all hover:shadow-lg active:scale-95"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <span className="text-[13px] font-medium text-white">Call Alex</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="w-[360px] rounded-2xl border border-[var(--sep)] bg-[var(--card)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold">Ready to Call Alex?</p>
                <p className="mt-1 text-[13px] text-[var(--secondary)]">
                  Alex will help you build an estimate through a voice conversation. Make sure you have your project details ready.
                </p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--secondary)]">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                  Microphone access required
                </p>
              </div>
              <div className="mt-2 flex w-full gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
                >
                  Not Yet
                </button>
                <button
                  onClick={() => { setShowConfirm(false); onCall(); }}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.97]"
                >
                  Start Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CallAlexPanel({ onClose }: { onClose: () => void }) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
      </div>
    }>
      <LazyCallAlexPanel onClose={onClose} />
    </Suspense>
  );
}
