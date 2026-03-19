import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? "";

export default function CallAlexPanel({ onClose, onEstimateCreated: _onEstimateCreated }: { onClose: () => void; onEstimateCreated?: (estimate: any) => void }) {
  const [error, setError] = useState<string | null>(null);
  const endingRef = useRef(false);

  const conversation = useConversation({
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError(typeof err === "string" ? err : "Connection lost. Please try again.");
    },
    volume: 1,
  });
  const started = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is required. Please allow microphone access and try again.");
      return;
    }
    try {
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "websocket",
      });
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Could not connect to Hunter. Please check your connection and try again.");
    }
  }, [conversation]);

  // Auto-start on mount — user already confirmed via the dialog
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      start();
    }
  }, [start]);

  const end = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await conversation.endSession();
    } catch {
      // Session may already be ended
    }
    onClose();
  }, [conversation, onClose]);

  const status = conversation.status;
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={end}>
      <div className="w-[420px] overflow-hidden rounded-2xl border border-[var(--sep)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sep)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold text-white ${error ? "bg-[var(--red)]" : status === "connected" ? "bg-[var(--green)]" : "bg-[var(--green)] text-white"}`}>H</div>
            <div>
              <p className="text-[15px] font-semibold">Hunter</p>
              <p className="text-[11px] text-[var(--secondary)]">
                {error ? "Connection Error" : status === "disconnected" ? "Estimation Assistant" : status === "connecting" ? "Connecting…" : isSpeaking ? "Speaking…" : "Listening…"}
              </p>
            </div>
          </div>
          <button onClick={end} className="rounded-md p-1 hover:bg-[var(--bg)]">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Status area */}
        <div className="h-[240px] overflow-y-auto border-b border-[var(--sep)] px-5 py-4">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            {error ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--red)]/10">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                </div>
                <p className="max-w-[280px] text-center text-[13px] text-[var(--secondary)]">{error}</p>
                <button onClick={() => { started.current = false; start(); }} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-95">
                  Retry
                </button>
              </>
            ) : status === "disconnected" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
                <p className="text-[13px] text-[var(--secondary)]">Initializing…</p>
              </>
            ) : status === "connecting" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
                <p className="text-[13px] text-[var(--secondary)]">Establishing connection…</p>
              </>
            ) : status === "connected" ? (
              <>
                <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${isSpeaking ? "bg-[var(--accent)]/10 animate-pulse" : "bg-[var(--green)]/10"}`}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={isSpeaking ? "var(--accent)" : "var(--green)"} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" />
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--secondary)]">
                  {isSpeaking ? "Hunter is speaking…" : "Listening — speak to Hunter"}
                </p>
              </>
            ) : null}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-5">
          <button onClick={end} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--red)] transition-all active:scale-90">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
