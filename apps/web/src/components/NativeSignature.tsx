"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";
import { Modal, Field, inputClass, textareaClass } from "./Modal";
import { Button } from "@proestimate/ui";

interface NativeSignatureProps {
  estimateId: string;
  clientEmail: string;
  estimateNumber?: string;
  disabled?: boolean;
}

/**
 * "Send for Signature" button + modal for native e-signing.
 *
 * Sends a sign request to the API which generates a portal signing link
 * and emails it to the client. Gated behind the docusign_integration
 * feature flag at the call site.
 */
export function NativeSignature({
  estimateId,
  clientEmail: initialEmail,
  estimateNumber,
  disabled = false,
}: NativeSignatureProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleOpen = () => {
    setEmail(initialEmail);
    setMessage("");
    setOpen(true);
  };

  const handleClose = () => {
    if (sending) return;
    setOpen(false);
  };

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Client email is required");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/sign-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: email.trim(),
          personalMessage: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      toast.success("Signature request sent successfully");
      setOpen(false);

      if (data.portalUrl && process.env.NODE_ENV === "development") {
        console.log("[NativeSignature] Portal URL:", data.portalUrl);
      }
    } catch (err) {
      Sentry.captureException(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to send signature request"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
        Send for Signature
      </button>

      {/* Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        title="Send for Signature"
        description="Send this estimate to your client for electronic signature"
        width="w-full max-w-[520px]"
      >
        <div className="space-y-5 px-6 py-5">
          {/* Summary card */}
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--label)]">
                  {estimateNumber ? `Estimate ${estimateNumber}` : "Estimate"}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--secondary)]">
                  Your client will receive an email with a secure link to review
                  and sign this estimate online.
                </p>
              </div>
            </div>
          </div>

          {/* Client email */}
          <Field label="Client Email *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className={inputClass}
              disabled={sending}
            />
          </Field>

          {/* Personal message */}
          <Field label="Personal Message (optional)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to include in the email..."
              rows={3}
              className={textareaClass}
              disabled={sending}
            />
          </Field>

          {/* Info note */}
          <div className="rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-[var(--secondary)]">
              The signing link is valid for 30 days. Your client can review the
              full estimate, draw their signature, and accept -- all from their
              browser. You will be notified when they sign.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
          <Button variant="secondary" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} loading={sending} disabled={!email.trim()}>
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Request
            </span>
          </Button>
        </div>
      </Modal>
    </>
  );
}
