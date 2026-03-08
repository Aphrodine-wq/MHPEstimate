"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

// ── useTableSync ──
// Subscribes to INSERT / UPDATE / DELETE on a Supabase table and keeps a
// local state array in sync. Optionally accepts a Postgres filter string
// (e.g. "estimate_id=eq.abc123") to scope the subscription.

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseTableSyncOptions<T extends object> {
  supabase: SupabaseClient;
  table: string;
  schema?: string;
  /** Postgres filter, e.g. "client_id=eq.abc123" */
  filter?: string;
  /** Which events to listen for (default: all three) */
  events?: ChangeEvent[];
  /** Primary key field name (default: "id") */
  primaryKey?: keyof T & string;
  /** If true, fetches initial rows on mount via supabase.from(table).select() */
  fetchOnMount?: boolean;
  /** Optional select columns for initial fetch */
  select?: string;
  /** Optional order for initial fetch */
  orderBy?: { column: keyof T & string; ascending?: boolean };
  /** When false, disables fetching and subscription (useful when supabase client may be null) */
  enabled?: boolean;
}

interface UseTableSyncReturn<T> {
  rows: T[];
  status: string;
  error: string | null;
  /** Force a re-fetch from the database */
  refetch: () => Promise<void>;
}

export function useTableSync<T extends object>({
  supabase,
  table,
  schema = "public",
  filter,
  events = ["INSERT", "UPDATE", "DELETE"],
  primaryKey = "id" as keyof T & string,
  fetchOnMount = true,
  select = "*",
  orderBy,
  enabled = true,
}: UseTableSyncOptions<T>): UseTableSyncReturn<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [status, setStatus] = useState<string>("CONNECTING");
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    let query = supabase.from(table).select(select);
    if (filter) {
      const eqIdx = filter.indexOf("=");
      const col = filter.slice(0, eqIdx);
      const rest = filter.slice(eqIdx + 1);
      const dotIdx = rest.indexOf(".");
      const op = rest.slice(0, dotIdx);
      const val = rest.slice(dotIdx + 1);
      query = query.filter(col, op, val);
    }
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? true,
      });
    }
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRows((data as unknown as T[]) ?? []);
    }
  }, [supabase, table, select, filter, orderBy, enabled]);

  useEffect(() => {
    if (fetchOnMount && enabled) {
      fetch();
    }
  }, [fetchOnMount, fetch, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const channelName = `sync-${table}-${filter ?? "all"}`;
    const channel = supabase
      .channel(channelName)
      .on<T>(
        "postgres_changes",
        {
          event: "*",
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (
            payload.eventType === "INSERT" &&
            events.includes("INSERT")
          ) {
            setRows((prev) => {
              const exists = prev.some(
                (r) => r[primaryKey] === (payload.new as T)[primaryKey]
              );
              return exists ? prev : [...prev, payload.new as T];
            });
          }

          if (
            payload.eventType === "UPDATE" &&
            events.includes("UPDATE")
          ) {
            setRows((prev) =>
              prev.map((r) =>
                r[primaryKey] === (payload.new as T)[primaryKey]
                  ? (payload.new as T)
                  : r
              )
            );
          }

          if (
            payload.eventType === "DELETE" &&
            events.includes("DELETE")
          ) {
            setRows((prev) =>
              prev.filter(
                (r) =>
                  r[primaryKey] !==
                  (payload.old as Partial<T>)[primaryKey]
              )
            );
          }
        }
      )
      .subscribe((s) => setStatus(s));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, schema, filter, events, primaryKey]);

  return { rows, status, error, refetch: fetch };
}

// ── useRealtimeRow ──
// Subscribes to changes on a single row by its primary key value.

interface UseRealtimeRowOptions<T extends object> {
  supabase: SupabaseClient;
  table: string;
  schema?: string;
  id: string;
  primaryKey?: keyof T & string;
  fetchOnMount?: boolean;
}

interface UseRealtimeRowReturn<T> {
  row: T | null;
  status: string;
}

export function useRealtimeRow<T extends object>({
  supabase,
  table,
  schema = "public",
  id,
  primaryKey = "id" as keyof T & string,
  fetchOnMount = true,
}: UseRealtimeRowOptions<T>): UseRealtimeRowReturn<T> {
  const [row, setRow] = useState<T | null>(null);
  const [status, setStatus] = useState<string>("CONNECTING");

  useEffect(() => {
    if (fetchOnMount) {
      supabase
        .from(table)
        .select("*")
        .eq(primaryKey, id as never)
        .single()
        .then(({ data }) => {
          if (data) setRow(data as T);
        });
    }
  }, [supabase, table, primaryKey, id, fetchOnMount]);

  useEffect(() => {
    const filter = `${primaryKey}=eq.${id}`;
    const channel = supabase
      .channel(`row-${table}-${id}`)
      .on<T>(
        "postgres_changes",
        { event: "*", schema, table, filter },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setRow(null);
          } else {
            setRow(payload.new as T);
          }
        }
      )
      .subscribe((s) => setStatus(s));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, schema, id, primaryKey]);

  return { row, status };
}

// ── useRealtimePresence ──
// Tracks which users are online in a given context (e.g. viewing an estimate).

interface PresenceState {
  userId: string;
  name: string;
  online_at: string;
  [key: string]: unknown;
}

interface UsePresenceOptions {
  supabase: SupabaseClient;
  channel: string;
  userId: string;
  name: string;
}

interface UsePresenceReturn {
  presentUsers: PresenceState[];
  status: string;
}

export function useRealtimePresence({
  supabase,
  channel: channelName,
  userId,
  name,
}: UsePresenceOptions): UsePresenceReturn {
  const [presentUsers, setPresentUsers] = useState<PresenceState[]>([]);
  const [status, setStatus] = useState<string>("CONNECTING");
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`presence-${channelName}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = Object.values(state).flat();
        setPresentUsers(users);
      })
      .subscribe(async (s) => {
        setStatus(s);
        if (s === "SUBSCRIBED") {
          await channel.track({
            userId,
            name,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, channelName, userId, name]);

  return { presentUsers, status };
}
