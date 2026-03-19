import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { integrationApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await integrationApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-quickbooks-disconnect" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const supabase = createServiceClient();

  // --- Deactivate the QB connection ---
  const { data: connection, error: updateError } = await supabase
    .from("integration_connections")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("provider", "quickbooks")
    .eq("is_active", true)
    .select("id")
    .single();

  if (updateError || !connection) {
    return NextResponse.json({ error: "No active QuickBooks connection found" }, { status: 404 });
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "quickbooks_disconnected",
    "integration_connection",
    connection.id,
    {},
    getClientIp(req),
  );

  return NextResponse.json({ success: true });
}
