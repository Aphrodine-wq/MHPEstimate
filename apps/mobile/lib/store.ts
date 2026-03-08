import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
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

const EMPTY_ESTIMATES: Estimate[] = [];
const EMPTY_CLIENTS: Client[] = [];
const EMPTY_INVOICES: Invoice[] = [];
const NOOP_REFRESH = async () => {};

export function useEstimates() {
  const { rows, status, refetch } = useTableSync<Estimate>({
    supabase: supabase!,
    table: "estimates",
    orderBy: { column: "created_at", ascending: false },
    enabled: !!supabase,
  });

  if (!supabase) return { data: EMPTY_ESTIMATES, loading: false, refresh: NOOP_REFRESH };

  return {
    data: rows,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

export function useClients() {
  const { rows, status, refetch } = useTableSync<Client>({
    supabase: supabase!,
    table: "clients",
    orderBy: { column: "created_at", ascending: false },
    enabled: !!supabase,
  });

  if (!supabase) return { data: EMPTY_CLIENTS, loading: false, refresh: NOOP_REFRESH };

  return {
    data: rows,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

export function useProducts() {
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

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sync-products-joined")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => { refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "unified_pricing" }, () => { refresh(); })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
}

export function useInvoices() {
  const { rows, status, refetch } = useTableSync<Invoice>({
    supabase: supabase!,
    table: "invoices",
    orderBy: { column: "created_at", ascending: false },
    enabled: !!supabase,
  });

  if (!supabase) return { data: EMPTY_INVOICES, loading: false, refresh: NOOP_REFRESH };

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
      .on("postgres_changes", { event: "*", schema: "public", table: "estimate_line_items", filter: `estimate_id=eq.${estimateId}` }, () => { refresh(); })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [estimateId, refresh]);

  return { data, loading, refresh };
}

export async function createEstimate(): Promise<Estimate | null> {
  if (!supabase) return null;

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

    const { data: estimate, error: insertError } = await supabase
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

    if (insertError) {
      if (insertError.code === "23505") continue;
      console.error("Failed to create estimate:", insertError);
      Alert.alert("Error", "Failed to create estimate");
      return null;
    }

    if (numbering) {
      await supabase
        .from("company_settings")
        .update({ value: { ...numbering, next_sequence: seq + 1 } })
        .eq("key", "estimate_numbering");
    }

    Alert.alert("Success", "Estimate created");
    return estimate as Estimate | null;
  }

  Alert.alert("Error", "Failed to create estimate");
  return null;
}

export function useCompanySettings() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase.from("company_settings").select("*");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "company_settings" }, () => { refresh(); })
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
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

  return useMemo(() => {
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
  }, [estimates, clients, invoices]);
}

export function useCurrentUser() {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("auth_id", authData.user.id)
        .single();
      setUser(data as TeamMember | null);
      setLoading(false);
    }
    load();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => { subscription.unsubscribe(); };
  }, []);

  return { user, loading };
}
