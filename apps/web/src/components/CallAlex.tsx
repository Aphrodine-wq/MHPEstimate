"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback } from "react";

const AGENT_ID = "agent_6801kj5q6ztmf0vsdeh45q4v4gnm";

export function CallAlexFAB({ onCall }: { onCall: () => void }) {
  return (
    <button
      onClick={onCall}
      className="fixed bottom-6 right-6 z-50 flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-5 shadow-md transition-all hover:shadow-lg active:scale-95"
    >
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      <span className="text-[13px] font-medium text-white">Call Alex</span>
    </button>
  );
}

export function CallAlexPanel({ onClose }: { onClose: () => void }) {
  const conversation = useConversation({
    onError: (error) => console.error("ElevenLabs error:", error),
  });

  const start = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }, [conversation]);

  const end = useCallback(async () => {
    await conversation.endSession();
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold text-white ${status === "connected" ? "bg-[var(--green)]" : "bg-[var(--gray5)] text-[var(--gray1)]"}`}>A</div>
            <div>
              <p className="text-[15px] font-semibold">Alex</p>
              <p className="text-[11px] text-[var(--secondary)]">
                {status === "disconnected" && "Estimation Assistant"}
                {status === "connecting" && "Connecting…"}
                {status === "connected" && (isSpeaking ? "Speaking…" : "Listening…")}
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
            {status === "disconnected" && (
              <p className="text-[13px] text-[var(--secondary)]">Start a call to begin your session with Alex</p>
            )}
            {status === "connecting" && (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
                <p className="text-[13px] text-[var(--secondary)]">Establishing connection…</p>
              </>
            )}
            {status === "connected" && (
              <>
                <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${isSpeaking ? "bg-[var(--accent)]/10 animate-pulse" : "bg-[var(--green)]/10"}`}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={isSpeaking ? "var(--accent)" : "var(--green)"} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" />
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--secondary)]">
                  {isSpeaking ? "Alex is speaking…" : "Listening — speak to Alex"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-5">
          {status === "disconnected" ? (
            <button onClick={start} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green)] transition-all active:scale-90">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          ) : (
            <button onClick={end} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--red)] transition-all active:scale-90">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
