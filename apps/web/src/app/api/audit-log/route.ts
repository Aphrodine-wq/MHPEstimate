import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

const auditLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

/** GET /api/audit-log — paginated audit log entries with optional filters */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 30 requests/minute per user ---
  try {
    await auditLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "audit-log" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  // Filters
  const entityType = searchParams.get("entity_type");
  const actionType = searchParams.get("action_type");
  const entityId = searchParams.get("entity_id");

  const supabase = createServiceClient();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }
  if (actionType) {
    query = query.eq("action_type", actionType);
  }
  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data, error, count } = await query;

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "audit-log" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
