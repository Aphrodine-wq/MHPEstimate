import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { timeTrackingApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Trade values matching the CHECK constraint on time_entries.trade
// ---------------------------------------------------------------------------
const TRADES = [
  "general",
  "framing",
  "electrical",
  "plumbing",
  "hvac",
  "drywall",
  "painting",
  "flooring",
  "roofing",
  "concrete",
  "demolition",
  "finish_carpentry",
  "tile",
  "insulation",
  "landscaping",
  "siding",
  "gutters",
  "windows_doors",
  "other",
] as const;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const clockInSchema = z.object({
  action: z.literal("clock_in"),
  estimate_id: z.string().uuid("estimate_id must be a valid UUID"),
  phase_id: z.string().uuid("phase_id must be a valid UUID").nullable().optional(),
  worker_name: z.string().min(1, "worker_name is required").max(200),
  trade: z.enum(TRADES).optional(),
  hourly_rate: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

const clockOutSchema = z.object({
  action: z.literal("clock_out"),
  entry_id: z.string().uuid("entry_id must be a valid UUID"),
  break_minutes: z.number().int().min(0).max(1440).optional(),
  notes: z.string().max(2000).optional(),
});

const postBodySchema = z.discriminatedUnion("action", [clockInSchema, clockOutSchema]);

// ---------------------------------------------------------------------------
// GET — List time entries
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await timeTrackingApiLimiter.check(30, user.id);
  } catch {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const estimateId = req.nextUrl.searchParams.get("estimateId");

  try {
    if (estimateId) {
      const est = await verifyEstimateOwnership(estimateId, orgId);
      if (!est) {
        return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
      }

      const { data, error } = await supabase
        .from("time_entries")
        .select("*, estimates!inner(id, estimate_number, project_type)")
        .eq("organization_id", orgId)
        .eq("estimate_id", estimateId)
        .order("clock_in", { ascending: false })
        .limit(200);

      if (error) {
        captureError(new Error(error.message), { route: "time-entries-get" });
        return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
      }

      return NextResponse.json({ entries: data ?? [] });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("time_entries")
      .select("*, estimates!inner(id, estimate_number, project_type)")
      .eq("organization_id", orgId)
      .gte("clock_in", sevenDaysAgo.toISOString())
      .order("clock_in", { ascending: false })
      .limit(200);

    if (error) {
      captureError(new Error(error.message), { route: "time-entries-get" });
      return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "time-entries-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Clock in / Clock out
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await timeTrackingApiLimiter.check(10, `write:${user.id}`);
  } catch {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = postBodySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    // -- CLOCK IN --
    if (validated.data.action === "clock_in") {
      const { estimate_id, phase_id, worker_name, trade, hourly_rate, notes } = validated.data;

      const est = await verifyEstimateOwnership(estimate_id, orgId);
      if (!est) {
        return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
      }

      const { data: openEntry } = await supabase
        .from("time_entries")
        .select("id")
        .eq("organization_id", orgId)
        .eq("estimate_id", estimate_id)
        .eq("worker_name", worker_name)
        .is("clock_out", null)
        .limit(1)
        .maybeSingle();

      if (openEntry) {
        return NextResponse.json(
          { error: "This worker already has an open time entry for this estimate. Clock out first." },
          { status: 409 },
        );
      }

      const { data: entry, error } = await supabase
        .from("time_entries")
        .insert({
          organization_id: orgId,
          estimate_id,
          phase_id: phase_id ?? null,
          worker_name,
          clock_in: new Date().toISOString(),
          trade: trade ?? null,
          hourly_rate: hourly_rate ?? null,
          notes: notes ?? null,
        })
        .select()
        .single();

      if (error) {
        captureError(new Error(error.message), { route: "time-entries-clock-in" });
        return NextResponse.json({ error: "Failed to clock in" }, { status: 500 });
      }

      await logAudit(
        user.id,
        "time_entry_clock_in",
        "time_entry",
        entry.id,
        { estimate_id, worker_name, trade },
        ip,
      );

      return NextResponse.json({ entry }, { status: 201 });
    }

    // -- CLOCK OUT --
    if (validated.data.action === "clock_out") {
      const { entry_id, break_minutes, notes } = validated.data;

      const { data: existing, error: fetchError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("id", entry_id)
        .eq("organization_id", orgId)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
      }

      if (existing.clock_out) {
        return NextResponse.json({ error: "This entry is already clocked out" }, { status: 409 });
      }

      const updatePayload: Record<string, unknown> = {
        clock_out: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (break_minutes !== undefined) updatePayload.break_minutes = break_minutes;
      if (notes !== undefined) updatePayload.notes = notes;

      const { data: updated, error: updateError } = await supabase
        .from("time_entries")
        .update(updatePayload)
        .eq("id", entry_id)
        .eq("organization_id", orgId)
        .select()
        .single();

      if (updateError) {
        captureError(new Error(updateError.message), { route: "time-entries-clock-out" });
        return NextResponse.json({ error: "Failed to clock out" }, { status: 500 });
      }

      await logAudit(
        user.id,
        "time_entry_clock_out",
        "time_entry",
        entry_id,
        {
          estimate_id: existing.estimate_id,
          worker_name: existing.worker_name,
          break_minutes,
          total_hours: updated.total_hours,
        },
        ip,
      );

      return NextResponse.json({ entry: updated });
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "time-entries-post" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
