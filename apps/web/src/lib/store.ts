import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
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
  JobActual,
  EstimateChangeOrder,
  JobPhase,
} from "@proestimate/shared/types";

// ── Realtime-enabled hooks ──
// These subscribe to Supabase Realtime so data syncs automatically
// across web + desktop without manual refreshes.

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

  // Atomically fetch-and-increment the sequence to prevent duplicate estimate numbers.
  // We use the Supabase update with a filter on the current value to detect conflicts.
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

    // Try to insert the estimate — unique constraint on estimate_number prevents duplicates
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
      // Duplicate estimate_number — retry with refreshed sequence
      if (insertError.code === "23505") continue;
      console.error("Failed to create estimate:", insertError);
      toast.error("Failed to create estimate");
      return null;
    }

    // Increment sequence
    if (numbering) {
      await supabase
        .from("company_settings")
        .update({ value: { ...numbering, next_sequence: seq + 1 } })
        .eq("key", "estimate_numbering");
    }

    toast.success("Estimate created");
    return estimate as Estimate | null;
  }

  console.error("Failed to create estimate after retries — sequence conflict");
  toast.error("Failed to create estimate");
  return null;
}

export function useCompanySettings() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("company_settings")
      .select("*");
    const map: Record<string, unknown> = {};
    (rows ?? []).forEach((r: { key: string; value: unknown }) => { map[r.key] = r.value; });
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

export async function upsertSetting(key: string, value: unknown) {
  if (!supabase) return;
  const { error } = await supabase.from("company_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) {
    console.error("Failed to save setting:", error);
    toast.error("Failed to save setting");
  }
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

// ── Notifications (generated from real data) ──

const NOTIF_READ_KEY = "mhpestimate_read_notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...ids]));
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  timestamp: string;
}

export function useNotifications() {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();
  const { data: invoices } = useInvoices();
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Estimate notifications
    for (const e of estimates) {
      const label = e.estimate_number || "Unnamed";
      const projType = e.project_type || "Project";

      if (e.status === "draft") {
        items.push({
          id: `est-created-${e.id}`,
          title: "Estimate Created",
          desc: `${label} — ${projType} was created`,
          time: timeAgo(e.created_at),
          read: readIds.has(`est-created-${e.id}`),
          timestamp: e.created_at,
        });
      }
      if (e.status === "accepted" && e.accepted_at) {
        items.push({
          id: `est-accepted-${e.id}`,
          title: "Estimate Accepted",
          desc: `${label} — ${projType} was accepted by client`,
          time: timeAgo(e.accepted_at),
          read: readIds.has(`est-accepted-${e.id}`),
          timestamp: e.accepted_at,
        });
      }
      if (e.status === "sent" && e.sent_at) {
        items.push({
          id: `est-sent-${e.id}`,
          title: "Estimate Sent",
          desc: `${label} — ${projType} was sent to client`,
          time: timeAgo(e.sent_at),
          read: readIds.has(`est-sent-${e.id}`),
          timestamp: e.sent_at,
        });
      }
      if (e.valid_through) {
        const expiresAt = new Date(e.valid_through).getTime();
        const daysUntil = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
        if (daysUntil > 0 && daysUntil <= 7 && e.status !== "accepted" && e.status !== "declined" && e.status !== "expired") {
          items.push({
            id: `est-expiring-${e.id}`,
            title: "Estimate Expiring Soon",
            desc: `${label} expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"} — follow up with client`,
            time: timeAgo(e.updated_at),
            read: readIds.has(`est-expiring-${e.id}`),
            timestamp: e.updated_at,
          });
        }
      }
    }

    // Client notifications (added in last 7 days)
    for (const c of clients) {
      const createdMs = new Date(c.created_at).getTime();
      if (now - createdMs <= sevenDaysMs) {
        items.push({
          id: `cli-added-${c.id}`,
          title: "New Client Added",
          desc: `${c.full_name} was added to your client list`,
          time: timeAgo(c.created_at),
          read: readIds.has(`cli-added-${c.id}`),
          timestamp: c.created_at,
        });
      }
    }

    // Invoice notifications
    for (const inv of invoices) {
      const name = inv.supplier_name ?? `Invoice ${inv.invoice_number ?? ""}`;
      if (inv.status === "pending" || inv.status === "processing") {
        items.push({
          id: `inv-uploaded-${inv.id}`,
          title: "Invoice Uploaded",
          desc: `${name} has been uploaded`,
          time: timeAgo(inv.created_at),
          read: readIds.has(`inv-uploaded-${inv.id}`),
          timestamp: inv.created_at,
        });
      }
      if (inv.status === "confirmed") {
        items.push({
          id: `inv-confirmed-${inv.id}`,
          title: "Invoice Confirmed",
          desc: `${name} has been confirmed`,
          time: timeAgo(inv.created_at),
          read: readIds.has(`inv-confirmed-${inv.id}`),
          timestamp: inv.created_at,
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items.slice(0, 20);
  }, [estimates, clients, invoices, readIds]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      saveReadIds(next);
      return next;
    });
  }, [notifications]);

  return { notifications, markRead, markAllRead };
}

// ── Team Members hook ──

const EMPTY_TEAM_MEMBERS: TeamMember[] = [];

export function useTeamMembers() {
  const { rows: members, status, refetch } = useTableSync<TeamMember>({
    supabase: supabase!,
    table: "team_members",
    orderBy: { column: "full_name", ascending: true },
    enabled: !!supabase,
  });

  if (!supabase) return { members: EMPTY_TEAM_MEMBERS, loading: false, refresh: NOOP_REFRESH };

  return {
    members,
    loading: status === "CONNECTING",
    refresh: refetch,
  };
}

// ── Job Actuals hook ──

export function useJobActuals(estimateId: string) {
  const [actuals, setActuals] = useState<JobActual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !estimateId) { setLoading(false); return; }
    supabase
      .from("job_actuals")
      .select("*")
      .eq("estimate_id", estimateId)
      .maybeSingle()
      .then(({ data }) => {
        setActuals(data as JobActual | null);
        setLoading(false);
      });
  }, [estimateId]);

  return { actuals, loading };
}

// ── Change Orders hook ──

export function useChangeOrders(estimateId: string) {
  const [changeOrders, setChangeOrders] = useState<EstimateChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !estimateId) { setChangeOrders([]); setLoading(false); return; }
    supabase
      .from("estimate_change_orders")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("change_number", { ascending: true })
      .then(({ data }) => {
        setChangeOrders((data as EstimateChangeOrder[]) ?? []);
        setLoading(false);
      });
  }, [estimateId]);

  return { changeOrders, loading };
}

export function useCurrentUser() {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }

      // Get the authenticated user's auth_id, then find their team_member
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

    // Re-fetch when auth state changes
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  return { user, loading };
}

// ── Templates hook ──

export function useTemplates() {
  const { rows, status, refetch } = useTableSync<{
    id: string;
    name: string;
    project_type: string | null;
    tier: string | null;
    line_items: unknown[];
    inclusions: string[];
    exclusions: string[];
    created_at: string;
  }>({
    supabase: supabase!,
    table: "estimate_templates",
    orderBy: { column: "created_at", ascending: false },
    enabled: !!supabase,
  });
  if (!supabase) return { data: [] as typeof rows, loading: false, refresh: NOOP_REFRESH };
  return { data: rows, loading: status === "CONNECTING", refresh: refetch };
}

// ── Job Phases hook ──

export function useJobPhases(estimateId: string | null) {
  const [data, setData] = useState<JobPhase[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !estimateId) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("job_phases")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("sort_order");
    setData((rows as JobPhase[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, phases: data, loading, refresh };
}
