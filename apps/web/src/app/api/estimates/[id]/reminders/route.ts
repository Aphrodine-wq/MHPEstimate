import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import type { ReminderType } from "@proestimate/shared";
import { captureError } from "@/lib/sentry";

type Params = { params: Promise<{ id: string }> };

const VALID_REMINDER_TYPES = new Set<ReminderType>(["follow_up", "expiry_warning", "custom"]);

/** GET /api/estimates/[id]/reminders — list reminders for an estimate */
export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 30 requests/minute per user ---
  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("estimate_reminders")
    .select("*")
    .eq("estimate_id", id)
    .order("scheduled_for", { ascending: true });

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "estimates-reminders" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reminders: data ?? [] });
}

/** POST /api/estimates/[id]/reminders — create a new reminder */
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    reminder_type?: string;
    scheduled_for?: string;
    message?: string | null;
  };

  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { reminder_type, scheduled_for, message } = body;

  if (!reminder_type || !VALID_REMINDER_TYPES.has(reminder_type as ReminderType)) {
    return NextResponse.json(
      { error: `reminder_type must be one of: ${[...VALID_REMINDER_TYPES].join(", ")}` },
      { status: 400 }
    );
  }

  if (!scheduled_for) {
    return NextResponse.json(
      { error: "scheduled_for is required (ISO 8601 timestamp)" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduled_for);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json(
      { error: "scheduled_for must be a valid ISO 8601 timestamp" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Verify estimate exists
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const { data: reminder, error: insertError } = await supabase
    .from("estimate_reminders")
    .insert({
      estimate_id: id,
      reminder_type,
      scheduled_for: scheduledDate.toISOString(),
      message: message?.trim() || null,
      status: "scheduled",
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log audit entry
  await logAudit(
    user.id,
    "reminder_scheduled",
    "estimate_reminder",
    reminder.id,
    {
      estimate_id: id,
      reminder_type,
      scheduled_for: scheduledDate.toISOString(),
    },
    getClientIp(req)
  );

  return NextResponse.json({ reminder }, { status: 201 });
}

/** PATCH /api/estimates/[id]/reminders — update a reminder (cancel, reschedule, edit message) */
export async function PATCH(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    reminder_id?: string;
    status?: string;
    scheduled_for?: string;
    message?: string | null;
  };

  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { reminder_id, status, scheduled_for, message } = body;

  if (!reminder_id) {
    return NextResponse.json({ error: "Missing reminder_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify reminder exists and belongs to this estimate
  const { data: existing, error: fetchErr } = await supabase
    .from("estimate_reminders")
    .select("id, status")
    .eq("id", reminder_id)
    .eq("estimate_id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  // Only scheduled reminders can be modified
  if (existing.status !== "scheduled") {
    return NextResponse.json(
      { error: `Only scheduled reminders can be updated (current status: ${existing.status})` },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {};

  if (status !== undefined) {
    const validStatuses = new Set(["scheduled", "cancelled"]);
    if (!validStatuses.has(status)) {
      return NextResponse.json(
        { error: "status can only be updated to 'scheduled' or 'cancelled'" },
        { status: 400 }
      );
    }
    updatePayload.status = status;
  }

  if (scheduled_for !== undefined) {
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "scheduled_for must be a valid ISO 8601 timestamp" },
        { status: 400 }
      );
    }
    updatePayload.scheduled_for = scheduledDate.toISOString();
  }

  if (message !== undefined) {
    updatePayload.message = message?.trim() || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("estimate_reminders")
    .update(updatePayload)
    .eq("id", reminder_id)
    .eq("estimate_id", id)
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "estimates-reminders" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log cancellation specifically
  if (status === "cancelled") {
    await logAudit(
      user.id,
      "reminder_cancelled",
      "estimate_reminder",
      reminder_id,
      { estimate_id: id },
      getClientIp(req)
    );
  }

  return NextResponse.json({ reminder: data });
}

/** DELETE /api/estimates/[id]/reminders — delete a scheduled reminder */
export async function DELETE(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let body: { reminder_id?: string };
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { reminder_id } = body;
  if (!reminder_id) {
    return NextResponse.json({ error: "Missing reminder_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the reminder exists, belongs to this estimate, and is scheduled
  const { data: existing, error: fetchErr } = await supabase
    .from("estimate_reminders")
    .select("id, status")
    .eq("id", reminder_id)
    .eq("estimate_id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  if (existing.status !== "scheduled") {
    return NextResponse.json(
      { error: "Only scheduled reminders can be deleted" },
      { status: 400 }
    );
  }

  const { error: deleteErr } = await supabase
    .from("estimate_reminders")
    .delete()
    .eq("id", reminder_id)
    .eq("estimate_id", id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * Auto-schedule default reminders when an estimate is sent.
 * Called internally from other API routes (not exposed as an endpoint).
 *
 * Creates:
 * 1. A follow-up reminder 3 days after sent_at
 * 2. An expiry warning 7 days before valid_through (if set)
 */
async function scheduleDefaultReminders(
  estimateId: string,
  userId: string,
  sentAt: string,
  validThrough: string | null
): Promise<void> {
  try {
    const supabase = createServiceClient();

    const reminders: Array<{
      estimate_id: string;
      reminder_type: string;
      scheduled_for: string;
      message: string;
      status: string;
      created_by: string;
    }> = [];

    // 1. Follow-up reminder: 3 days after estimate is sent
    const followUpDate = new Date(sentAt);
    followUpDate.setDate(followUpDate.getDate() + 3);
    reminders.push({
      estimate_id: estimateId,
      reminder_type: "follow_up",
      scheduled_for: followUpDate.toISOString(),
      message: "Follow up with client — estimate was sent 3 days ago.",
      status: "scheduled",
      created_by: userId,
    });

    // 2. Expiry warning: 7 days before valid_through
    if (validThrough) {
      const expiryWarningDate = new Date(validThrough);
      expiryWarningDate.setDate(expiryWarningDate.getDate() - 7);

      // Only schedule if the warning date is in the future
      if (expiryWarningDate.getTime() > Date.now()) {
        reminders.push({
          estimate_id: estimateId,
          reminder_type: "expiry_warning",
          scheduled_for: expiryWarningDate.toISOString(),
          message: "Estimate expires in 7 days — follow up with client.",
          status: "scheduled",
          created_by: userId,
        });
      }
    }

    if (reminders.length > 0) {
      const { error } = await supabase
        .from("estimate_reminders")
        .insert(reminders);

      if (error) {
        console.error("[reminders] Failed to schedule default reminders:", error.message);
      }
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-reminders" });
    console.error("[reminders] Unexpected error scheduling default reminders:", err);
  }
}
