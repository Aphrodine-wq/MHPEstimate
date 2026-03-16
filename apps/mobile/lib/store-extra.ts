/**
 * Additional store hooks for screens added after the initial mobile MVP.
 * These supplement lib/store.ts with voice calls, job actuals, and change orders.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import type { VoiceCall, JobActual, EstimateChangeOrder } from "@proestimate/shared/types";

const EMPTY_CALLS: VoiceCall[] = [];
const NOOP = async () => {};

export function useVoiceCalls() {
  const [data, setData] = useState<VoiceCall[]>(EMPTY_CALLS);
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

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sync-voice-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_calls" }, () => refresh())
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [refresh]);

  return { data, loading, refresh };
}

export function useJobActuals(estimateId: string | null) {
  const [actuals, setActuals] = useState<JobActual | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !estimateId) { setActuals(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("job_actuals")
      .select("*")
      .eq("estimate_id", estimateId)
      .single();
    setActuals((data as JobActual) ?? null);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { actuals, loading, refresh };
}

export function useChangeOrders(estimateId: string | null) {
  const [data, setData] = useState<EstimateChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !estimateId) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("estimate_change_orders")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("change_number");
    setData((rows as EstimateChangeOrder[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!supabase || !estimateId) return;
    const channel = supabase
      .channel(`sync-co-${estimateId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "estimate_change_orders", filter: `estimate_id=eq.${estimateId}` }, () => refresh())
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [estimateId, refresh]);

  return { data, loading, refresh };
}
