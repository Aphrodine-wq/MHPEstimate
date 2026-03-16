import { z } from "zod";

/**
 * Reusable Zod schemas for API request validation.
 * Use with validateBody() helper to get typed results or error responses.
 */

export const signatureSchema = z.object({
  signatureDataUrl: z.string().max(500_000, "Signature data too large"), // ~375KB base64 max
  signerName: z.string().min(1).max(200),
  signerEmail: z.string().email().max(254).optional(),
});

export const changeOrderCreateSchema = z.object({
  description: z.string().min(1).max(2000),
  cost_impact: z.number().finite(),
  timeline_impact: z.string().max(500).nullable().optional(),
});

export const changeOrderUpdateSchema = z.object({
  change_order_id: z.string().uuid(),
  description: z.string().min(1).max(2000).optional(),
  cost_impact: z.number().finite().optional(),
  timeline_impact: z.string().max(500).nullable().optional(),
  status: z.enum(["approved", "rejected"]).optional(),
});

export const changeOrderDeleteSchema = z.object({
  change_order_id: z.string().uuid(),
});

export const sendEstimateSchema = z.object({
  to: z.string().email().max(254),
  cc: z.string().email().max(254).optional(),
  message: z.string().max(5000).optional(),
});

export const teamInviteSchema = z.object({
  email: z.string().email().max(254),
  full_name: z.string().min(1).max(200),
  role: z.enum(["estimator", "pm", "field_tech", "sales", "admin", "owner"]),
});

export const declineSchema = z.object({
  reason: z.string().max(2000).optional(),
  declinerName: z.string().min(1).max(200).optional(),
});

export const portalChangeOrderSignSchema = z.object({
  changeOrderId: z.string().uuid("Invalid change order ID"),
  signerName: z.string().min(1, "Signer name is required").max(200),
});

export const portalChangeOrderResponseSchema = z.object({
  changeOrderId: z.string().uuid("Invalid change order ID"),
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Action must be 'approve' or 'reject'" }),
  }),
  signerName: z.string().min(1, "Signer name is required").max(200),
  signatureDataUrl: z.string().max(500_000, "Signature data too large").optional(),
  reason: z.string().max(2000, "Reason too long").optional(),
});

/**
 * Helper to validate a request body against a Zod schema.
 * Returns typed result on success or validation error on failure.
 *
 * @example
 * const result = validateBody(changeOrderCreateSchema, req.body);
 * if ("error" in result) {
 *   return Response.json({ error: result.error }, { status: 400 });
 * }
 * const { data } = result;
 * // data is now properly typed
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues.map((i) => i.message).join(", ") };
  }
  return { data: result.data };
}
