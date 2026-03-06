import { z } from "zod";

export const clientSchema = z.object({
  full_name: z.string().min(1, "Client name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip: z.string().max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export const estimateCreateSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  project_type: z.string().min(1, "Project type is required"),
  project_address: z.string().optional().nullable(),
  tier: z.enum(["good", "better", "best"]).default("better"),
  source: z.enum(["manual", "voice", "template"]).default("manual"),
  scope_inclusions: z.array(z.string()).default([]),
  scope_exclusions: z.array(z.string()).default([]),
  site_conditions: z.string().optional().nullable(),
  estimated_start: z.string().optional().nullable(),
  estimated_end: z.string().optional().nullable(),
});

export const lineItemSchema = z.object({
  estimate_id: z.string().uuid(),
  line_number: z.number().int().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().optional().nullable(),
  unit_price: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  price_source: z.enum(["home_depot", "lowes", "invoice", "manual"]).optional().nullable(),
});

export const invoiceUploadSchema = z.object({
  supplier_name: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  invoice_date: z.string().optional().nullable(),
});
