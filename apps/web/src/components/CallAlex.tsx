import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import type { Estimate } from "@proestimate/shared/types";
import { PhotoCapture, type CapturedPhoto } from "./PhotoCapture";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";
const AGENT_CONFIGURED = AGENT_ID.length > 0;

interface TranscriptMessage {
  message: string;
  source: string;
}

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
                <p className="mt-1.5 flex items-center justify-center gap-1 text-[11px] text-[var(--secondary)]">
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

export function CallAlexPanel({
  onClose,
  onEstimateCreated,
}: {
  onClose: () => void;
  onEstimateCreated?: (estimate: Estimate) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [callEnded, setCallEnded] = useState(false);
  const [creatingEstimate, setCreatingEstimate] = useState(false);
  const wasConnected = useRef(false);
  const endingRef = useRef(false);

  const conversation = useConversation({
    onError: (err) => {
      Sentry.captureException(err);
      setError(typeof err === "string" ? err : "Connection lost. Please try again.");
    },
    onMessage: (msg: TranscriptMessage) => {
      setTranscript((prev) => [...prev, msg]);
    },
    onDisconnect: () => {
      if (wasConnected.current) {
        setCallEnded(true);
      }
    },
    volume: 1,
  });

  const started = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setCallEnded(false);
    wasConnected.current = false;
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
      Sentry.captureException(err);
      setError("Could not connect to Alex. Please check your connection and try again.");
    }
  }, [conversation]);

  // Auto-start on mount
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      start();
    }
  }, [start]);

  // Track when the call becomes connected
  useEffect(() => {
    if (conversation.status === "connected") {
      wasConnected.current = true;
    }
  }, [conversation.status]);

  const end = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      await conversation.endSession();
    } catch {
      // Session may already be ended
    }
    // If there's transcript content, show the post-call screen
    // (onDisconnect will set callEnded = true)
    // If not connected yet, just close
    if (!wasConnected.current) {
      onClose();
    }
  }, [conversation, onClose]);

  const handleCreateEstimate = useCallback(async () => {
    if (creatingEstimate || transcript.length === 0) return;
    setCreatingEstimate(true);
    try {
      const res = await fetch("/api/calls/to-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: transcript }),
      });
      const data = await res.json();
      if (!res.ok || !data.estimate) {
        throw new Error(data.error ?? "Failed to create estimate");
      }
      toast.success("Draft estimate created — review and edit before submitting");
      onEstimateCreated?.(data.estimate as Estimate);
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Could not create estimate. Please try again.");
    } finally {
      setCreatingEstimate(false);
    }
  }, [transcript, creatingEstimate, onEstimateCreated]);

  const status = conversation.status;
  const isSpeaking = conversation.isSpeaking;

  // Post-call screen
  if (callEnded) {
    const hasTranscript = transcript.length > 1;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="w-[420px] overflow-hidden rounded-2xl border border-[var(--sep)] bg-[var(--card)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--sep)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gray4)] text-[14px] font-semibold text-white">A</div>
              <div>
                <p className="text-[15px] font-semibold">Call Complete</p>
                <p className="text-[11px] text-[var(--secondary)]">
                  {transcript.length} message{transcript.length !== 1 ? "s" : ""} captured
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-[var(--bg)]">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green)]/10">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            {hasTranscript ? (
              <>
                <p className="text-[15px] font-semibold">Would you like to create a draft estimate?</p>
                <p className="mt-1.5 text-[13px] text-[var(--secondary)]">
                  Alex will extract the project details from your conversation and create a draft. You&apos;ll need to review and edit it before it can be submitted for approval.
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold">Call ended</p>
                <p className="mt-1.5 text-[13px] text-[var(--secondary)]">
                  Not enough conversation to create an estimate. Start a new call or create an estimate manually.
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2 border-t border-[var(--sep)] px-5 py-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--sep)] py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg)]"
            >
              Close
            </button>
            {hasTranscript && (
              <button
                onClick={handleCreateEstimate}
                disabled={creatingEstimate}
                className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {creatingEstimate ? "Creating draft…" : "Create Draft Estimate"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={end}>
      <div className="w-[420px] overflow-hidden rounded-2xl border border-[var(--sep)] bg-[var(--card)] shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sep)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold text-white ${error ? "bg-[var(--red)]" : status === "connected" ? "bg-[var(--green)]" : "bg-[var(--gray5)] text-[var(--gray1)]"}`}>A</div>
            <div>
              <p className="text-[15px] font-semibold">Alex</p>
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
                <button onClick={() => { started.current = false; endingRef.current = false; start(); }} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all active:scale-95">
                  Retry
                </button>
              </>
            ) : status === "disconnected" || status === "connecting" ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gray4)] border-t-[var(--accent)]" />
                <p className="text-[13px] text-[var(--secondary)]">
                  {status === "connecting" ? "Establishing connection…" : "Initializing…"}
                </p>
              </>
            ) : status === "connected" ? (
              <>
                <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${isSpeaking ? "bg-[var(--accent)]/10 animate-pulse" : "bg-[var(--green)]/10"}`}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke={isSpeaking ? "var(--accent)" : "var(--green)"} strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" />
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--secondary)]">
                  {isSpeaking ? "Alex is speaking…" : "Listening — speak to Alex"}
                </p>
                {transcript.length > 0 && (
                  <p className="text-[11px] text-[var(--tertiary)]">
                    {transcript.length} message{transcript.length !== 1 ? "s" : ""} captured
                  </p>
                )}
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
