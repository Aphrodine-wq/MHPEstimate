/**
 * Labor Rate Presets API
 *
 * IMPORTANT: The `labor_rate_presets` table must exist in Supabase before this route works.
 *
 * CREATE TABLE labor_rate_presets (
 *   id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   organization_id uuid,
 *   trade         text NOT NULL,
 *   role          text NOT NULL DEFAULT 'journeyman',
 *   hourly_rate   numeric(10,2) NOT NULL,
 *   overtime_rate  numeric(10,2),
 *   is_default    boolean NOT NULL DEFAULT false,
 *   created_at    timestamptz DEFAULT now(),
 *   updated_at    timestamptz DEFAULT now()
 * );
 *
 * -- RLS policy (single-org for now, expand later):
 * ALTER TABLE labor_rate_presets ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Authenticated users can manage labor rates"
 *   ON labor_rate_presets FOR ALL USING (true) WITH CHECK (true);
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { captureError } from "@/lib/sentry";

interface LaborRateBody {
  id?: string;
  trade?: string;
  role?: string;
  hourly_rate?: number;
  overtime_rate?: number | null;
  is_default?: boolean;
}

/** GET /api/labor-rates — Fetch all labor rate presets */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("labor_rate_presets")
    .select("*")
    .order("trade", { ascending: true })
    .order("role", { ascending: true });

  if (error) {
    captureError(new Error(error.message), { route: "labor-rates-get" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rates: data ?? [] });
}

/** POST /api/labor-rates — Create a new labor rate preset */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LaborRateBody;
  try {
    body = (await req.json()) as LaborRateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { trade, role, hourly_rate, overtime_rate, is_default } = body;

  if (!trade || typeof trade !== "string" || !trade.trim()) {
    return NextResponse.json({ error: "trade is required" }, { status: 400 });
  }
  if (hourly_rate === undefined || typeof hourly_rate !== "number" || hourly_rate < 0) {
    return NextResponse.json({ error: "hourly_rate must be a non-negative number" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("labor_rate_presets")
    .insert({
      trade: trade.trim(),
      role: (role ?? "journeyman").trim(),
      hourly_rate,
      overtime_rate: overtime_rate ?? null,
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "labor-rates-post" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rate: data }, { status: 201 });
}

/** PATCH /api/labor-rates — Update an existing labor rate preset */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LaborRateBody;
  try {
    body = (await req.json()) as LaborRateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.trade !== undefined) updates.trade = body.trade.trim();
  if (body.role !== undefined) updates.role = body.role.trim();
  if (body.hourly_rate !== undefined) updates.hourly_rate = body.hourly_rate;
  if (body.overtime_rate !== undefined) updates.overtime_rate = body.overtime_rate;
  if (body.is_default !== undefined) updates.is_default = body.is_default;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("labor_rate_presets")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "labor-rates-patch" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rate: data });
}

/** DELETE /api/labor-rates — Delete a labor rate preset */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("labor_rate_presets")
    .delete()
    .eq("id", id);

  if (error) {
    captureError(new Error(error.message), { route: "labor-rates-delete" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
