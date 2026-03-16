import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers.
 * GET /api/health
 *
 * Returns only the minimum information needed for health probes.
 * No config details, environment names, uptime, or service booleans
 * — those leak deployment info to unauthenticated callers.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
