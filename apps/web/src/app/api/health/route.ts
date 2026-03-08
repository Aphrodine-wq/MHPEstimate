import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health
 */
export async function GET() {
  const now = new Date().toISOString();

  return NextResponse.json(
    {
      status: "ok",
      timestamp: now,
      version: process.env.npm_package_version ?? "0.0.0",
      environment: process.env.NODE_ENV ?? "unknown",
      uptime: process.uptime(),
      checks: {
        supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        elevenlabs: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
      },
    },
    { status: 200 }
  );
}
