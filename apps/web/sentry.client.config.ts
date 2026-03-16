import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? "development",

  // In production sample 20% of transactions; capture everything in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Replay: low-frequency session recording, full capture on errors
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs to avoid capturing PII
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  beforeSend(event, hint) {
    // Never send events in development unless DSN is explicitly set
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }

    const err = hint?.originalException;
    const msg = err instanceof Error ? err.message : String(err ?? "");

    // Filter out noisy browser errors that are not actionable
    if (
      msg.includes("ResizeObserver loop") ||
      msg.includes("ResizeObserver Loop") ||
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk") ||
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed") ||
      msg.includes("Script error")
    ) {
      return null;
    }

    return event;
  },
});
