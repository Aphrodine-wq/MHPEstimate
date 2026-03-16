import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

interface LineItem {
  category: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  extended_price: number | null;
}

interface Client {
  full_name: string;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate QuickBooks IIF (Intuit Interchange Format) content.
 *
 * IIF structure:
 * - Header rows start with ! (define columns)
 * - TRNS = transaction header line
 * - SPL = split lines (line items)
 * - ENDTRNS = end of transaction
 */
function generateIIF(
  estimate: Record<string, unknown>,
  lineItems: LineItem[],
  client: Client | null
): string {
  const lines: string[] = [];
  const estNumber = estimate.estimate_number as string;
  const date = formatDate((estimate.created_at as string) || new Date().toISOString());
  const customerName = client?.full_name || "Customer";
  const grandTotal = Number(estimate.grand_total) || 0;

  // IIF Header
  lines.push("!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO");
  lines.push("!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO");
  lines.push("!ENDTRNS");

  // Transaction header — Accounts Receivable debit
  lines.push(
    `TRNS\tESTIMATE\t${date}\tAccounts Receivable\t${customerName}\t${grandTotal.toFixed(2)}\t${estNumber}\t${estimate.project_type || "Construction Estimate"}`
  );

  // Split lines — one per line item, credited to income
  for (const item of lineItems) {
    const amount = Number(item.extended_price) || 0;
    const accountName =
      item.category === "labor"
        ? "Labor Income"
        : item.category === "subcontractor"
          ? "Subcontractor Income"
          : "Materials Income";

    lines.push(
      `SPL\tESTIMATE\t${date}\t${accountName}\t${customerName}\t${(-amount).toFixed(2)}\t${estNumber}\t${item.description}`
    );
  }

  // Add overhead, contingency, tax as separate split lines if present
  const overhead = Number(estimate.overhead_profit) || 0;
  if (overhead > 0) {
    lines.push(
      `SPL\tESTIMATE\t${date}\tOverhead & Profit\t${customerName}\t${(-overhead).toFixed(2)}\t${estNumber}\tOverhead & Profit`
    );
  }

  const contingency = Number(estimate.contingency) || 0;
  if (contingency > 0) {
    lines.push(
      `SPL\tESTIMATE\t${date}\tContingency\t${customerName}\t${(-contingency).toFixed(2)}\t${estNumber}\tContingency`
    );
  }

  const tax = Number(estimate.tax) || 0;
  if (tax > 0) {
    lines.push(
      `SPL\tESTIMATE\t${date}\tSales Tax Payable\t${customerName}\t${(-tax).toFixed(2)}\t${estNumber}\tSales Tax`
    );
  }

  const permits = Number(estimate.permits_fees) || 0;
  if (permits > 0) {
    lines.push(
      `SPL\tESTIMATE\t${date}\tPermits & Fees\t${customerName}\t${(-permits).toFixed(2)}\t${estNumber}\tPermits & Fees`
    );
  }

  lines.push("ENDTRNS");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generate CSV export of estimate line items.
 */
function generateCSV(
  estimate: Record<string, unknown>,
  lineItems: LineItem[],
  client: Client | null
): string {
  const rows: string[] = [];

  // Header
  rows.push("Estimate Number,Client,Project Type,Date,Category,Description,Quantity,Unit,Unit Price,Extended Price");

  const estNumber = estimate.estimate_number as string;
  const clientName = client?.full_name || "";
  const projectType = (estimate.project_type as string) || "";
  const date = (estimate.created_at as string)?.slice(0, 10) || "";

  for (const item of lineItems) {
    rows.push(
      [
        escapeField(estNumber),
        escapeField(clientName),
        escapeField(projectType),
        date,
        escapeField(item.category),
        escapeField(item.description),
        item.quantity ?? "",
        escapeField(item.unit || ""),
        item.unit_price?.toFixed(2) ?? "",
        item.extended_price?.toFixed(2) ?? "",
      ].join(",")
    );
  }

  // Summary rows
  rows.push("");
  rows.push(`,,,,,,,,Materials Subtotal,${Number(estimate.materials_subtotal || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Labor Subtotal,${Number(estimate.labor_subtotal || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Subcontractor Total,${Number(estimate.subcontractor_total || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Permits & Fees,${Number(estimate.permits_fees || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Overhead & Profit,${Number(estimate.overhead_profit || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Contingency,${Number(estimate.contingency || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Tax,${Number(estimate.tax || 0).toFixed(2)}`);
  rows.push(`,,,,,,,,Grand Total,${Number(estimate.grand_total || 0).toFixed(2)}`);

  return rows.join("\r\n") + "\r\n";
}

export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-quickbooks-export" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { estimateId?: string };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-quickbooks-export" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { estimateId } = body;
  if (!estimateId) {
    return NextResponse.json({ error: "Missing estimateId" }, { status: 400 });
  }

  const format = req.nextUrl.searchParams.get("format") || "iif";
  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberError || !teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch estimate
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("line_number");

  // Fetch client if assigned
  let client: Client | null = null;
  if (estimate.client_id) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("full_name, email, address_line1, city, state, zip")
      .eq("id", estimate.client_id)
      .single();
    client = clientData as Client | null;
  }

  const items = (lineItems as LineItem[]) ?? [];
  const estNumber = estimate.estimate_number as string;

  if (format === "csv") {
    const csv = generateCSV(estimate, items, client);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${estNumber}_export.csv"`,
      },
    });
  }

  await logAudit(
    user.id,
    "estimate_exported",
    "estimate",
    estimateId,
    { format, estimate_number: estNumber },
    getClientIp(req)
  );

  // Default: IIF
  const iif = generateIIF(estimate, items, client);
  return new NextResponse(iif, {
    headers: {
      "Content-Type": "application/x-iif",
      "Content-Disposition": `attachment; filename="${estNumber}_quickbooks.iif"`,
    },
  });
}
