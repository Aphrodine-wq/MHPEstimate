"use client";

import type { JSX } from "react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // Log to Sentry or console in production
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)", color: "var(--label)" }}
    >
      <div className="text-center max-w-md">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--red)", opacity: 0.1 }}
        >
          <svg
            width="32"
            height="32"
            fill="none"
            viewBox="0 0 24 24"
            stroke="var(--red)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="mt-4 text-[22px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--secondary)" }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-1 text-[12px] font-mono" style={{ color: "var(--tertiary)" }}>
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl px-6 py-3 text-[14px] font-medium text-white transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: "var(--accent)" }}
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-xl border px-6 py-3 text-[14px] font-medium transition-colors hover:bg-[var(--bg)]"
            style={{ borderColor: "var(--sep)" }}
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
