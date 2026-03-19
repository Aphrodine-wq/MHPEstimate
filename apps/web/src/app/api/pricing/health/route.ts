import { NextResponse } from "next/server";

interface RetailerHealth {
  name: string;
  status: "connected" | "down" | "rate_limited" | "auth_required" | "unknown";
  lastChecked: string;
  responseTimeMs: number | null;
}

const MCP_SCRAPER_URL = process.env.MCP_SCRAPER_URL ?? "";

/**
 * GET /api/pricing/health
 * Returns the health status of each MCP retailer connection.
 * If the MCP scraper is not configured, returns default statuses.
 */
export async function GET() {
  const now = new Date().toISOString();

  // If MCP scraper URL is configured, try to get real health data
  if (MCP_SCRAPER_URL) {
    try {
      const res = await fetch(`${MCP_SCRAPER_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fall through to defaults
    }
  }

  // Default response when MCP scraper is not configured or unreachable
  const retailers: RetailerHealth[] = [
    { name: "Home Depot", status: "unknown", lastChecked: now, responseTimeMs: null },
    { name: "Lowe's", status: "unknown", lastChecked: now, responseTimeMs: null },
    { name: "Ferguson", status: "unknown", lastChecked: now, responseTimeMs: null },
    { name: "Amazon", status: "unknown", lastChecked: now, responseTimeMs: null },
  ];

  return NextResponse.json({ retailers });
}
