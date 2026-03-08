// Supabase Edge Function — server-side estimate calculation
// This moves margin and pricing calculations off the client
// to prevent users from inspecting/manipulating profit data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalculateRequest {
  estimate_id: string;
  line_items: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>;
  project_type: string;
  tier: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CalculateRequest = await req.json();
    const { estimate_id, line_items, project_type, tier } = body;

    // Calculate materials subtotal
    const materialsSubtotal = line_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    );

    // Apply waste factor based on project type
    const wasteFactors: Record<string, number> = {
      porch: 0.10, deck: 0.12, kitchen: 0.08, bathroom: 0.08,
      new_build: 0.15, addition: 0.12, siding: 0.10, roofing: 0.12,
      flooring: 0.10, painting: 0.05, electrical: 0.05, plumbing: 0.05,
      hvac: 0.05, landscaping: 0.08, general: 0.10,
    };
    const wasteFactor = wasteFactors[project_type.toLowerCase()] ?? 0.10;
    const materialsWithWaste = materialsSubtotal * (1 + wasteFactor);

    // Labor calculation (server-side, hidden from client)
    const laborRate = 65; // $/hr base rate — configurable via company_settings
    const laborHoursEstimate = materialsSubtotal / 150; // rough heuristic
    const laborSubtotal = laborHoursEstimate * laborRate;

    // Margin calculation (the sensitive part we protect)
    const tierMargins: Record<string, number> = {
      budget: 0.20, good: 0.20,
      midrange: 0.30, better: 0.30,
      high_end: 0.40, best: 0.40,
    };
    const marginPct = tierMargins[tier] ?? 0.30;
    const costBase = materialsWithWaste + laborSubtotal;
    const overheadProfit = costBase * marginPct;

    // Contingency
    const contingencyPct = 0.05;
    const contingency = costBase * contingencyPct;

    // Tax (configurable)
    const taxRate = 0.07;
    const tax = materialsWithWaste * taxRate;

    const grandTotal = materialsWithWaste + laborSubtotal + overheadProfit + contingency + tax;

    // Update the estimate in the database
    const { error: updateError } = await supabase
      .from("estimates")
      .update({
        materials_subtotal: Math.round(materialsWithWaste * 100) / 100,
        labor_subtotal: Math.round(laborSubtotal * 100) / 100,
        overhead_profit: Math.round(overheadProfit * 100) / 100,
        contingency: Math.round(contingency * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        grand_total: Math.round(grandTotal * 100) / 100,
        gross_margin_pct: Math.round(marginPct * 100 * 100) / 100,
      })
      .eq("id", estimate_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        materials_subtotal: Math.round(materialsWithWaste * 100) / 100,
        labor_subtotal: Math.round(laborSubtotal * 100) / 100,
        overhead_profit: Math.round(overheadProfit * 100) / 100,
        contingency: Math.round(contingency * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        grand_total: Math.round(grandTotal * 100) / 100,
        gross_margin_pct: Math.round(marginPct * 100 * 100) / 100,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
