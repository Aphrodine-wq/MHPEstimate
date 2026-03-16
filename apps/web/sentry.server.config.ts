import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? "development",

  // Sample 20% of server-side transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  beforeSend(event, hint) {
    // Never send events in development unless DSN is explicitly set
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }

    const err = hint?.originalException;
    const msg = err instanceof Error ? err.message : String(err ?? "");

    // Filter out network-level and expected operational errors
    if (
      msg.includes("ECONNRESET") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("EPIPE") ||
      msg.includes("socket hang up") ||
      msg.includes("Rate limit exceeded")
    ) {
      return null;
    }

    return event;
  },
});
