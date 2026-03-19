import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { integrationApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { encryptToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    // Redirect to app with error since this is a browser redirect flow
    return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
  }

  // --- Rate limiting ---
  try {
    await integrationApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-quickbooks-callback" });
    return NextResponse.redirect(new URL("/?error=rate_limit", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const realmId = req.nextUrl.searchParams.get("realmId");

  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("qb_oauth_state")?.value;

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", req.url));
  }

  if (!code || !realmId) {
    return NextResponse.redirect(new URL("/?error=missing_params", req.url));
  }

  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const redirectUri = process.env.QB_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/?error=not_configured", req.url));
  }

  // --- Exchange code for tokens ---
  let tokenData: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
  };

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      captureError(new Error(`QB token exchange failed: ${errorText}`), { route: "integrations-quickbooks-callback" });
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
    }

    tokenData = await tokenResponse.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-quickbooks-callback" });
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
  }

  // --- Encrypt tokens ---
  const encryptedAccessToken = encryptToken(tokenData.access_token);
  const encryptedRefreshToken = encryptToken(tokenData.refresh_token);

  const supabase = createServiceClient();

  // --- Upsert integration_connections row ---
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + tokenData.x_refresh_token_expires_in * 1000,
  ).toISOString();

  const { error: upsertError } = await supabase
    .from("integration_connections")
    .upsert(
      {
        user_id: user.id,
        provider: "quickbooks",
        realm_id: realmId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: expiresAt,
        refresh_token_expires_at: refreshExpiresAt,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );

  if (upsertError) {
    captureError(new Error(upsertError.message), { route: "integrations-quickbooks-callback" });
    return NextResponse.redirect(new URL("/?error=save_failed", req.url));
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "quickbooks_connected",
    "integration_connection",
    null,
    { realm_id: realmId },
    getClientIp(req),
  );

  // Redirect to settings page on success
  const baseUrl = new URL(req.url).origin;
  const redirectResponse = NextResponse.redirect(new URL("/?tab=settings&integration=quickbooks_connected", baseUrl));
  redirectResponse.cookies.delete("qb_oauth_state");
  return redirectResponse;
}
