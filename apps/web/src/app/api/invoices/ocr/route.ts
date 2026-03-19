import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { autoEstimateLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  image: z.string().min(1, "Image data is required"),
  mediaType: z.enum(["image/jpeg", "image/png", "application/pdf"]).default("image/jpeg"),
});

// Schema for Claude Vision structured extraction
const invoiceExtractionSchema = z.object({
  supplierName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().min(0),
        unit: z.string(),
        unitPrice: z.number().min(0),
        extendedPrice: z.number().min(0),
      }),
    )
    .default([]),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
});

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await autoEstimateLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "invoices-ocr" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "invoices-ocr" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { image, mediaType } = validated.data;

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invoice OCR not available — ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  // --- Call Claude Vision for invoice extraction ---
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are an invoice OCR assistant for a construction company. Extract structured data from supplier invoices (Home Depot, Lowe's, lumber yards, etc.). Return JSON only — no explanation, no markdown.

Return JSON matching this exact schema:
{
  "supplierName": string,
  "invoiceNumber": string,
  "invoiceDate": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": string,
      "quantity": number,
      "unit": string,
      "unitPrice": number,
      "extendedPrice": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number
}

Rules:
- Extract ALL line items visible on the invoice
- For Home Depot / Lowe's receipts, extract each SKU line
- unit should be: "each", "sq ft", "lin ft", "bundle", "gallon", "sheet", "box", "roll", "bag", "ton"
- If a field is not visible, omit it from the JSON
- Dates must be ISO format (YYYY-MM-DD)
- All prices in USD, no currency symbols in numbers`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png",
                data: image,
              },
            },
            {
              type: "text",
              text: "Extract all invoice data from this image and return structured JSON.",
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response from AI");

    const text = content.text.trim();
    const jsonText = text.startsWith("```")
      ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
      : text;

    const parsed: unknown = JSON.parse(jsonText);
    const extractionResult = invoiceExtractionSchema.safeParse(parsed);
    if (!extractionResult.success) {
      console.error("Invoice OCR validation failed:", extractionResult.error);
      return NextResponse.json({ error: "AI response validation failed" }, { status: 500 });
    }

    return NextResponse.json({ extraction: extractionResult.data });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "invoices-ocr" });
    return NextResponse.json({ error: "Invoice OCR failed" }, { status: 500 });
  }
}
