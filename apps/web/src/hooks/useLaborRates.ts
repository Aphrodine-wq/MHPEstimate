import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export interface LaborRatePreset {
  id: string;
  organization_id: string | null;
  trade: string;
  role: string;
  hourly_rate: number;
  overtime_rate: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type NewRate = Pick<LaborRatePreset, "trade" | "role" | "hourly_rate"> &
  Partial<Pick<LaborRatePreset, "overtime_rate" | "is_default">>;

type RateUpdate = { id: string } & Partial<
  Pick<LaborRatePreset, "trade" | "role" | "hourly_rate" | "overtime_rate" | "is_default">
>;

export function useLaborRates() {
  const [rates, setRates] = useState<LaborRatePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("labor_rate_presets")
      .select("*")
      .order("trade", { ascending: true })
      .order("role", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRates((data as LaborRatePreset[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription for labor_rate_presets changes
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("sync-labor-rate-presets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labor_rate_presets" },
        () => {
          refresh();
        }
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [refresh]);

  const addRate = useCallback(
    async (rate: NewRate): Promise<LaborRatePreset | null> => {
      if (!supabase) return null;

      const { data, error: insertError } = await supabase
        .from("labor_rate_presets")
        .insert({
          trade: rate.trade.trim(),
          role: rate.role.trim(),
          hourly_rate: rate.hourly_rate,
          overtime_rate: rate.overtime_rate ?? null,
          is_default: rate.is_default ?? false,
        })
        .select()
        .single();

      if (insertError) {
        toast.error("Failed to add labor rate");
        console.error("Failed to add labor rate:", insertError);
        return null;
      }

      toast.success("Labor rate added");
      return data as LaborRatePreset;
    },
    []
  );

  const updateRate = useCallback(
    async (update: RateUpdate): Promise<LaborRatePreset | null> => {
      if (!supabase) return null;

      const { id, ...fields } = update;
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.trade !== undefined) payload.trade = fields.trade.trim();
      if (fields.role !== undefined) payload.role = fields.role.trim();
      if (fields.hourly_rate !== undefined) payload.hourly_rate = fields.hourly_rate;
      if (fields.overtime_rate !== undefined) payload.overtime_rate = fields.overtime_rate;
      if (fields.is_default !== undefined) payload.is_default = fields.is_default;

      const { data, error: updateError } = await supabase
        .from("labor_rate_presets")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        toast.error("Failed to update labor rate");
        console.error("Failed to update labor rate:", updateError);
        return null;
      }

      toast.success("Labor rate updated");
      return data as LaborRatePreset;
    },
    []
  );

  const deleteRate = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase) return false;

      const { error: deleteError } = await supabase
        .from("labor_rate_presets")
        .delete()
        .eq("id", id);

      if (deleteError) {
        toast.error("Failed to delete labor rate");
        console.error("Failed to delete labor rate:", deleteError);
        return false;
      }

      toast.success("Labor rate deleted");
      return true;
    },
    []
  );

  return { rates, loading, error, addRate, updateRate, deleteRate, refresh };
}
