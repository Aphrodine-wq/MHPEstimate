import { createServiceClient } from "./supabase-server";
import type { AuditActionType, AuditEntityType } from "@proestimate/shared";

/**
 * Log an audit trail entry. Call this from API routes after significant actions.
 *
 * Uses the service-role client so it bypasses RLS — the API route is
 * responsible for authenticating the user before calling this.
 *
 * Failures are logged to the console but never thrown — audit logging
 * should not break the primary operation.
 */
export async function logAudit(
  userId: string,
  actionType: AuditActionType,
  entityType: AuditEntityType,
  entityId: string | null,
  metadata?: Record<string, unknown>,
  ipAddress?: string | null
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("audit_log").insert({
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? {},
      ip_address: ipAddress ?? null,
    });

    if (error) {
      console.error("[audit] Failed to insert audit log entry:", error.message);
    }
  } catch (err) {
    console.error("[audit] Unexpected error logging audit entry:", err);
  }
}

/**
 * Log a failed authentication attempt for security monitoring.
 * Used in critical API routes (send, sign, payment-link) to track
 * unauthorized access attempts. Non-throwing.
 */
export async function logAuthFailure(
  action: string,
  metadata: Record<string, unknown>,
  ipAddress?: string | null
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("audit_log").insert({
      user_id: null,
      action_type: action,
      entity_type: "auth",
      entity_id: null,
      metadata,
      ip_address: ipAddress ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to log auth failure:", err);
  }
}

/**
 * Extract the client IP address from a Next.js request.
 * Checks x-forwarded-for (Vercel/proxied) then x-real-ip.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; take the first
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip") ?? null;
}
