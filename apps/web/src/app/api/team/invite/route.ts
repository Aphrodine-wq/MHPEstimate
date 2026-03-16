import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { inviteLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

const INVITE_LIMIT = 10; // max 10 invites per hour per user

const VALID_ROLES = new Set(["admin", "pm", "estimator", "field_tech", "sales"]);

interface InviteBody {
  name?: string;
  email?: string;
  role?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Server-side domain restriction ---
  // The @northmshomepros.com check exists client-side too, but we enforce it
  // here so that API calls bypassing the UI are rejected.
  if (!user.email?.endsWith("@northmshomepros.com")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Rate limiting: 10 invites per hour per user ---
  try {
    await inviteLimiter.check(INVITE_LIMIT, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "team-invite" });
    return NextResponse.json(
      { error: "Too many invites. Please wait an hour and try again." },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: InviteBody;
  try {
    body = await req.json() as InviteBody;
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "team-invite" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, role } = body;

  // --- Validate fields ---
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${[...VALID_ROLES].join(", ")}` },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName  = name.trim();

  const supabase = createServiceClient();

  // --- Permission check: inviter must be owner or admin ---
  const { data: inviter, error: inviterError } = await supabase
    .from("team_members")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (inviterError || !inviter) {
    return NextResponse.json({ error: "Your team member record was not found" }, { status: 403 });
  }

  if (inviter.role !== "owner" && inviter.role !== "admin") {
    return NextResponse.json(
      { error: "Only owners and admins can invite team members" },
      { status: 403 }
    );
  }

  // --- Check for existing invited/active member with same email ---
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    const msg = existing.is_active
      ? "A team member with this email already exists"
      : "An inactive team member with this email already exists. Reactivate them instead.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // --- Create the team_members record with status='invited' ---
  // We insert before sending the auth invite so the record exists even if the email
  // service is temporarily unavailable. The auth_id stays null until the user accepts.
  const { data: member, error: insertError } = await supabase
    .from("team_members")
    .insert({
      full_name:  normalizedName,
      email:      normalizedEmail,
      role,
      is_active:  false,   // not active until they complete sign-up
      auth_id:    null,
    })
    .select()
    .single();

  if (insertError || !member) {
    console.error("Failed to create team member record:", insertError);
    return NextResponse.json({ error: "Failed to create team member record" }, { status: 500 });
  }

  // --- Send the Supabase auth invite email ---
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: {
      full_name:        normalizedName,
      team_member_id:   member.id,
      role,
    },
  });

  if (inviteError) {
    // Roll back the team_members record so a retry is possible
    await supabase.from("team_members").delete().eq("id", member.id);
    console.error("Supabase invite error:", inviteError);
    return NextResponse.json(
      { error: "Failed to send invite email. Please try again." },
      { status: 500 }
    );
  }

  await logAudit(
    user.id,
    "team_member_invited",
    "team_member",
    member.id,
    { email: normalizedEmail, role },
    getClientIp(req)
  );

  return NextResponse.json({ success: true, memberId: member.id });
}
