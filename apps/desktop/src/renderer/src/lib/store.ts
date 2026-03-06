import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import type {
  Estimate,
  Client,
  Product,
  Invoice,
  VoiceCall,
  TeamMember,
} from "@proestimate/shared/types";

export function useEstimates() {
  const [data, setData] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("estimates")
      .select("*")
      .order("created_at", { ascending: false });
    setData((rows as Estimate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useClients() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setData((rows as Client[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
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
  return { data, loading, refresh };
}

export function useInvoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    setData((rows as Invoice[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
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
