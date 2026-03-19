import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { purchaseOrderApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// PO Status values matching the CHECK constraint
// ---------------------------------------------------------------------------
const PO_STATUSES = ["draft", "sent", "confirmed", "partial", "fulfilled", "cancelled"] as const;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const lineItemSchema = z.object({
  estimate_line_item_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1, "description is required").max(500),
  quantity: z.number().min(0),
  unit: z.string().max(50).optional(),
  unit_price: z.number().min(0),
  notes: z.string().max(2000).nullable().optional(),
});

const createPOSchema = z.object({
  estimate_id: z.string().uuid("estimate_id must be a valid UUID"),
  vendor_name: z.string().min(1, "vendor_name is required").max(300),
  vendor_contact: z.string().max(200).nullable().optional(),
  vendor_phone: z.string().max(50).nullable().optional(),
  vendor_email: z.string().email().nullable().optional(),
  order_date: z.string().nullable().optional(),
  expected_delivery: z.string().nullable().optional(),
  delivery_address: z.string().max(500).nullable().optional(),
  tax: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  line_items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

const patchPOSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  status: z.enum(PO_STATUSES).optional(),
  vendor_name: z.string().min(1).max(300).optional(),
  vendor_contact: z.string().max(200).nullable().optional(),
  vendor_phone: z.string().max(50).nullable().optional(),
  vendor_email: z.string().email().nullable().optional(),
  order_date: z.string().nullable().optional(),
  expected_delivery: z.string().nullable().optional(),
  delivery_address: z.string().max(500).nullable().optional(),
  tax: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  // For receiving items
  received_items: z
    .array(
      z.object({
        line_item_id: z.string().uuid(),
        received_qty: z.number().min(0),
      }),
    )
    .optional(),
});

// ---------------------------------------------------------------------------
// GET — List purchase orders
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await purchaseOrderApiLimiter.check(30, user.id);
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
        .from("purchase_orders")
        .select("*, po_line_items(*), estimates!inner(id, estimate_number, project_type)")
        .eq("organization_id", orgId)
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        captureError(new Error(error.message), { route: "purchase-orders-get" });
        return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
      }

      return NextResponse.json({ purchase_orders: data ?? [] });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, po_line_items(*), estimates!inner(id, estimate_number, project_type)")
      .eq("organization_id", orgId)
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      captureError(new Error(error.message), { route: "purchase-orders-get" });
      return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
    }

    return NextResponse.json({ purchase_orders: data ?? [] });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "purchase-orders-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create a purchase order with line items
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await purchaseOrderApiLimiter.check(10, `write:${user.id}`);
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

  const validated = createPOSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { estimate_id, vendor_name, vendor_contact, vendor_phone, vendor_email, order_date, expected_delivery, delivery_address, tax, shipping, notes, line_items } = validated.data;

    const est = await verifyEstimateOwnership(estimate_id, orgId);
    if (!est) {
      return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
    }

    const { count } = await supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    const seq = (count ?? 0) + 1;
    const poNumber = `PO-${String(seq).padStart(4, "0")}`;

    const subtotal = line_items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
    const total = subtotal + (tax ?? 0) + (shipping ?? 0);

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        organization_id: orgId,
        estimate_id,
        po_number: poNumber,
        vendor_name,
        vendor_contact: vendor_contact ?? null,
        vendor_phone: vendor_phone ?? null,
        vendor_email: vendor_email ?? null,
        status: "draft",
        subtotal,
        tax: tax ?? 0,
        shipping: shipping ?? 0,
        total,
        order_date: order_date ?? null,
        expected_delivery: expected_delivery ?? null,
        delivery_address: delivery_address ?? null,
        notes: notes ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (poError) {
      captureError(new Error(poError.message), { route: "purchase-orders-create" });
      return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
    }

    const lineItemRows = line_items.map((li) => ({
      purchase_order_id: po.id,
      estimate_line_item_id: li.estimate_line_item_id ?? null,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit ?? "each",
      unit_price: li.unit_price,
      notes: li.notes ?? null,
    }));

    const { error: liError } = await supabase
      .from("po_line_items")
      .insert(lineItemRows);

    if (liError) {
      captureError(new Error(liError.message), { route: "purchase-orders-create-items" });
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      return NextResponse.json({ error: "Failed to create line items" }, { status: 500 });
    }

    const { data: completePO } = await supabase
      .from("purchase_orders")
      .select("*, po_line_items(*), estimates!inner(id, estimate_number, project_type)")
      .eq("id", po.id)
      .single();

    await logAudit(
      user.id,
      "purchase_order_created",
      "purchase_order",
      po.id,
      { estimate_id, vendor_name, po_number: poNumber, total, item_count: line_items.length },
      ip,
    );

    return NextResponse.json({ purchase_order: completePO }, { status: 201 });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "purchase-orders-post" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update PO status, receive items
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await purchaseOrderApiLimiter.check(10, `write:${user.id}`);
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

  const validated = patchPOSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { id, received_items, ...updates } = validated.data;

    const { data: existing, error: fetchError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (received_items && received_items.length > 0) {
      for (const item of received_items) {
        const { error: recvError } = await supabase
          .from("po_line_items")
          .update({
            received_qty: item.received_qty,
            status: item.received_qty > 0 ? "received" : "pending",
          })
          .eq("id", item.line_item_id)
          .eq("purchase_order_id", id);

        if (recvError) {
          captureError(new Error(recvError.message), { route: "purchase-orders-receive" });
        }
      }

      await logAudit(
        user.id,
        "po_items_received",
        "purchase_order",
        id,
        { items_count: received_items.length },
        ip,
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.vendor_name !== undefined) updatePayload.vendor_name = updates.vendor_name;
    if (updates.vendor_contact !== undefined) updatePayload.vendor_contact = updates.vendor_contact;
    if (updates.vendor_phone !== undefined) updatePayload.vendor_phone = updates.vendor_phone;
    if (updates.vendor_email !== undefined) updatePayload.vendor_email = updates.vendor_email;
    if (updates.order_date !== undefined) updatePayload.order_date = updates.order_date;
    if (updates.expected_delivery !== undefined) updatePayload.expected_delivery = updates.expected_delivery;
    if (updates.delivery_address !== undefined) updatePayload.delivery_address = updates.delivery_address;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;

    if (updates.tax !== undefined || updates.shipping !== undefined) {
      const newTax = updates.tax ?? existing.tax ?? 0;
      const newShipping = updates.shipping ?? existing.shipping ?? 0;
      updatePayload.tax = newTax;
      updatePayload.shipping = newShipping;
      updatePayload.total = (existing.subtotal ?? 0) + newTax + newShipping;
    }

    const { data: updated, error: updateError } = await supabase
      .from("purchase_orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select("*, po_line_items(*), estimates!inner(id, estimate_number, project_type)")
      .single();

    if (updateError) {
      captureError(new Error(updateError.message), { route: "purchase-orders-patch" });
      return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
    }

    const auditAction = updates.status ? "purchase_order_status_changed" : "purchase_order_updated";
    await logAudit(
      user.id,
      auditAction,
      "purchase_order",
      id,
      { status: updates.status, vendor_name: existing.vendor_name },
      ip,
    );

    return NextResponse.json({ purchase_order: updated });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "purchase-orders-patch" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
