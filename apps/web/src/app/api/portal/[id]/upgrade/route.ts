import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: estimateId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!estimateId || !token) {
    return NextResponse.json({ error: "Missing estimate ID or token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("portal_get_upgrades", {
    p_estimate_id: estimateId,
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: estimateId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!estimateId || !token) {
    return NextResponse.json({ error: "Missing estimate ID or token" }, { status: 400 });
  }

  let body: { optionId?: string; selected?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { optionId, selected } = body;
  if (!optionId || typeof selected !== "boolean") {
    return NextResponse.json({ error: "optionId and selected are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("portal_toggle_upgrade", {
    p_estimate_id: estimateId,
    p_token: token,
    p_option_id: optionId,
    p_selected: selected,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
