import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { selectionApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Status values matching the CHECK constraints
// ---------------------------------------------------------------------------
const SHEET_STATUSES = ["draft", "sent", "in_progress", "completed", "approved"] as const;
const ITEM_STATUSES = ["pending", "selected", "ordered", "installed"] as const;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const optionSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().min(0),
  thumbnail: z.string().max(500).nullable().optional(),
});

const selectionItemSchema = z.object({
  category: z.string().min(1, "category is required").max(100),
  item_name: z.string().min(1, "item_name is required").max(200),
  room: z.string().max(200).nullable().optional(),
  budget_amount: z.number().min(0).nullable().optional(),
  options: z.array(optionSchema).min(1, "At least one option is required"),
  sort_order: z.number().int().min(0).optional(),
});

const createSheetSchema = z.object({
  estimate_id: z.string().uuid("estimate_id must be a valid UUID"),
  name: z.string().min(1, "name is required").max(300),
  due_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(selectionItemSchema).optional(),
});

const patchSheetSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  name: z.string().min(1).max(300).optional(),
  status: z.enum(SHEET_STATUSES).optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  select_item: z
    .object({
      item_id: z.string().uuid(),
      selected_option: z.number().int().min(0),
      actual_amount: z.number().min(0),
      client_notes: z.string().max(2000).nullable().optional(),
    })
    .optional(),
  add_items: z.array(selectionItemSchema).optional(),
});

// ---------------------------------------------------------------------------
// GET — List selection sheets
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await selectionApiLimiter.check(30, user.id);
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
        .from("selection_sheets")
        .select("*, selection_items(*), estimates!inner(id, estimate_number, project_type)")
        .eq("organization_id", orgId)
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        captureError(new Error(error.message), { route: "selections-get" });
        return NextResponse.json({ error: "Failed to fetch selection sheets" }, { status: 500 });
      }

      return NextResponse.json({ selection_sheets: data ?? [] });
    }

    const { data, error } = await supabase
      .from("selection_sheets")
      .select("*, selection_items(*), estimates!inner(id, estimate_number, project_type)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      captureError(new Error(error.message), { route: "selections-get" });
      return NextResponse.json({ error: "Failed to fetch selection sheets" }, { status: 500 });
    }

    return NextResponse.json({ selection_sheets: data ?? [] });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "selections-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create a selection sheet with items
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await selectionApiLimiter.check(10, `write:${user.id}`);
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

  const validated = createSheetSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { estimate_id, name, due_date, notes, items } = validated.data;

    const est = await verifyEstimateOwnership(estimate_id, orgId);
    if (!est) {
      return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
    }

    const { data: sheet, error: sheetError } = await supabase
      .from("selection_sheets")
      .insert({
        organization_id: orgId,
        estimate_id,
        name,
        status: "draft",
        due_date: due_date ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (sheetError) {
      captureError(new Error(sheetError.message), { route: "selections-create" });
      return NextResponse.json({ error: "Failed to create selection sheet" }, { status: 500 });
    }

    if (items && items.length > 0) {
      const itemRows = items.map((item, idx) => ({
        sheet_id: sheet.id,
        category: item.category,
        item_name: item.item_name,
        room: item.room ?? null,
        budget_amount: item.budget_amount ?? null,
        options: item.options,
        sort_order: item.sort_order ?? idx,
      }));

      const { error: itemError } = await supabase
        .from("selection_items")
        .insert(itemRows);

      if (itemError) {
        captureError(new Error(itemError.message), { route: "selections-create-items" });
        await supabase.from("selection_sheets").delete().eq("id", sheet.id);
        return NextResponse.json({ error: "Failed to create selection items" }, { status: 500 });
      }
    }

    const { data: completeSheet } = await supabase
      .from("selection_sheets")
      .select("*, selection_items(*), estimates!inner(id, estimate_number, project_type)")
      .eq("id", sheet.id)
      .single();

    await logAudit(
      user.id,
      "selection_sheet_created",
      "selection_sheet",
      sheet.id,
      { estimate_id, name, item_count: items?.length ?? 0 },
      ip,
    );

    return NextResponse.json({ selection_sheet: completeSheet }, { status: 201 });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "selections-post" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update selection sheet, select option, add items
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await selectionApiLimiter.check(10, `write:${user.id}`);
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

  const validated = patchSheetSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { id, select_item, add_items, ...updates } = validated.data;

    const { data: existing, error: fetchError } = await supabase
      .from("selection_sheets")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Selection sheet not found" }, { status: 404 });
    }

    if (select_item) {
      const { item_id, selected_option, actual_amount, client_notes } = select_item;

      const itemUpdate: Record<string, unknown> = {
        selected_option,
        actual_amount,
        status: "selected" as const,
      };
      if (client_notes !== undefined) itemUpdate.client_notes = client_notes;

      const { error: selError } = await supabase
        .from("selection_items")
        .update(itemUpdate)
        .eq("id", item_id)
        .eq("sheet_id", id);

      if (selError) {
        captureError(new Error(selError.message), { route: "selections-select-item" });
        return NextResponse.json({ error: "Failed to update selection" }, { status: 500 });
      }

      await logAudit(
        user.id,
        "selection_item_selected",
        "selection_item",
        item_id,
        { sheet_id: id, selected_option, actual_amount },
        ip,
      );
    }

    if (add_items && add_items.length > 0) {
      const itemRows = add_items.map((item, idx) => ({
        sheet_id: id,
        category: item.category,
        item_name: item.item_name,
        room: item.room ?? null,
        budget_amount: item.budget_amount ?? null,
        options: item.options,
        sort_order: item.sort_order ?? idx,
      }));

      const { error: addError } = await supabase
        .from("selection_items")
        .insert(itemRows);

      if (addError) {
        captureError(new Error(addError.message), { route: "selections-add-items" });
        return NextResponse.json({ error: "Failed to add items" }, { status: 500 });
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
      if (updates.status === "sent" && !existing.sent_at) {
        updatePayload.sent_at = new Date().toISOString();
      }
      if (updates.status === "completed") {
        updatePayload.completed_at = new Date().toISOString();
      }
    }
    if (updates.due_date !== undefined) updatePayload.due_date = updates.due_date;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;

    const { data: updated, error: updateError } = await supabase
      .from("selection_sheets")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select("*, selection_items(*), estimates!inner(id, estimate_number, project_type)")
      .single();

    if (updateError) {
      captureError(new Error(updateError.message), { route: "selections-patch" });
      return NextResponse.json({ error: "Failed to update selection sheet" }, { status: 500 });
    }

    const auditAction = updates.status ? "selection_sheet_status_changed" : "selection_sheet_updated";
    await logAudit(
      user.id,
      auditAction,
      "selection_sheet",
      id,
      { status: updates.status, name: existing.name },
      ip,
    );

    return NextResponse.json({ selection_sheet: updated });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "selections-patch" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
