import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { inviteLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

const RESEND_LIMIT = 10; // shares the hourly invite budget

interface ResendBody {
  memberId?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: shares the hourly invite budget ---
  try {
    await inviteLimiter.check(RESEND_LIMIT, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "team-invite-resend" });
    return NextResponse.json(
      { error: "Too many requests. Please wait an hour and try again." },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: ResendBody;
  try {
    body = await req.json() as ResendBody;
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "team-invite-resend" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberId, email } = body;
  if (!memberId || !email) {
    return NextResponse.json({ error: "memberId and email are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Permission check ---
  const { data: inviter } = await supabase
    .from("team_members")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!inviter || (inviter.role !== "owner" && inviter.role !== "admin")) {
    return NextResponse.json(
      { error: "Only owners and admins can resend invites" },
      { status: 403 }
    );
  }

  // --- Confirm the member record exists and is still in invited state ---
  const { data: member } = await supabase
    .from("team_members")
    .select("id, email, auth_id, is_active")
    .eq("id", memberId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  if (member.auth_id || member.is_active) {
    return NextResponse.json(
      { error: "This member has already accepted their invite" },
      { status: 409 }
    );
  }

  // --- Resend via Supabase auth invite ---
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    member.email as string,
    { data: { team_member_id: member.id } }
  );

  if (inviteError) {
    console.error("Supabase resend invite error:", inviteError);
    return NextResponse.json(
      { error: "Failed to resend invite email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
