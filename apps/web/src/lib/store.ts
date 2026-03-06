import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useTableSync } from "@proestimate/ui/realtime";
import type {
  Estimate,
  Client,
  Product,
  Invoice,
  VoiceCall,
  TeamMember,
  EstimateLineItem,
} from "@proestimate/shared/types";

// ── Realtime-enabled hooks ──
// These subscribe to Supabase Realtime so data syncs automatically
// across web + desktop without manual refreshes.

export function useEstimates() {
  if (!supabase) return { data: [] as Estimate[], loading: false, refresh: async () => {} };

  const { rows, status, refetch } = useTableSync<Estimate>({
    supabase,
    table: "estimates",
    orderBy: { column: "created_at", ascending: false },
  });

  return {
    data: rows,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

export function useClients() {
  if (!supabase) return { data: [] as Client[], loading: false, refresh: async () => {} };

  const { rows, status, refetch } = useTableSync<Client>({
    supabase,
    table: "clients",
    orderBy: { column: "created_at", ascending: false },
  });

  return {
    data: rows,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

export function useProducts() {
  // Products use a joined select, so we keep the manual fetch
  // but add realtime subscription for the products table to trigger refetch
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("products")
      .select("*, unified_pricing(*)")
      .eq("is_active", true)
      .order("name");
    setData((rows as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Subscribe to product changes and refetch when they happen
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase!
      .channel("sync-products-joined")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => { refresh(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unified_pricing" },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
}

export function useInvoices() {
  if (!supabase) return { data: [] as Invoice[], loading: false, refresh: async () => {} };

  const { rows, status, refetch } = useTableSync<Invoice>({
    supabase,
    table: "invoices",
    orderBy: { column: "created_at", ascending: false },
  });

  return {
    data: rows,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

export function useLineItems(estimateId: string | null) {
  const [data, setData] = useState<EstimateLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !estimateId) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("estimate_line_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("line_number");
    setData((rows as EstimateLineItem[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase || !estimateId) return;
    const channel = supabase
      .channel(`sync-line-items-${estimateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estimate_line_items", filter: `estimate_id=eq.${estimateId}` },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [estimateId, refresh]);

  return { data, loading, refresh };
}

export function useVoiceCalls() {
  const [data, setData] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("voice_calls")
      .select("*")
      .order("started_at", { ascending: false });
    setData((rows as VoiceCall[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export async function createEstimate(): Promise<Estimate | null> {
  if (!supabase) return null;

  // Get next estimate number
  const { data: settings } = await supabase
    .from("company_settings")
    .select("value")
    .eq("key", "estimate_numbering")
    .single();

  const numbering = settings?.value as { prefix: string; year_format: string; next_sequence: number } | undefined;
  const seq = numbering?.next_sequence ?? 1;
  const prefix = numbering?.prefix ?? "EST";
  const year = new Date().getFullYear();
  const estimate_number = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

  const { data: estimate } = await supabase
    .from("estimates")
    .insert({
      estimate_number,
      project_type: "General",
      status: "draft",
      tier: "better",
      source: "manual",
      scope_inclusions: [],
      scope_exclusions: [],
    })
    .select()
    .single();

  // Increment sequence
  if (numbering) {
    await supabase
      .from("company_settings")
      .update({ value: { ...numbering, next_sequence: seq + 1 } })
      .eq("key", "estimate_numbering");
  }

  return estimate as Estimate | null;
}

export function useCompanySettings() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("company_settings")
      .select("*");
    const map: Record<string, any> = {};
    (rows ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setData(map);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sync-company-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_settings" },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
}

export async function upsertSetting(key: string, value: any) {
  if (!supabase) return;
  await supabase.from("company_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

export interface ActivityEntry {
  id: string;
  type: "estimate" | "client" | "invoice" | "call";
  action: string;
  description: string;
  timestamp: string;
}

export function useActivityFeed() {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();
  const { data: invoices } = useInvoices();

  const entries: ActivityEntry[] = [
    ...estimates.slice(0, 10).map((e) => ({
      id: `est-${e.id}`,
      type: "estimate" as const,
      action: e.status === "draft" ? "created" : e.status,
      description: `${e.estimate_number} — ${e.project_type}`,
      timestamp: e.updated_at,
    })),
    ...clients.slice(0, 5).map((c) => ({
      id: `cli-${c.id}`,
      type: "client" as const,
      action: "added",
      description: c.full_name,
      timestamp: c.created_at,
    })),
    ...invoices.slice(0, 5).map((inv) => ({
      id: `inv-${inv.id}`,
      type: "invoice" as const,
      action: inv.status,
      description: inv.supplier_name ?? `Invoice ${inv.invoice_number ?? ""}`,
      timestamp: inv.created_at,
    })),
  ];

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries.slice(0, 15);
}

export function useCurrentUser() {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      setUser(data as TeamMember | null);
      setLoading(false);
    }
    load();
  }, []);

  return { user, loading };
}
