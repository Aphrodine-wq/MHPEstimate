/**
 * Renderer-side Sync Handler
 *
 * Listens for push/pull requests from the main process sync engine and
 * executes them against the authenticated Supabase client. This module
 * bridges the gap between the main process (which manages the sync queue
 * in SQLite) and Supabase (which requires auth tokens held by the renderer).
 *
 * Must be initialized after the Supabase client is available.
 */

import { supabase } from "./supabase";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SyncPushItem {
  queueId: number;
  table: string;
  recordId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, any> | null;
}

interface SyncPushResult {
  queueId: number;
  success: boolean;
  error?: string;
  serverRecord?: Record<string, any>;
}

interface SyncPullResult {
  table: string;
  records: Record<string, any>[];
}

// Valid table names that can be synced
const VALID_TABLES = ["estimates", "clients", "estimate_line_items", "products"];

// Columns to strip before sending to Supabase (SQLite-only metadata)
const STRIP_COLUMNS = new Set(["rowid"]);

// ─── Initialization ─────────────────────────────────────────────────────────────

let cleanupFns: Array<() => void> = [];

/**
 * Initialize the sync handler. Sets up IPC listeners for push/pull requests
 * from the main process. Call once when the app mounts.
 */
export function initSyncHandler(): () => void {
  const api = window.electronAPI;
  if (!api?.sync) {
    console.warn("[sync-handler] electronAPI.sync not available");
    return () => {};
  }

  // Report browser online/offline status to main process
  const handleOnline = () => api.sync.reportOnlineStatus(true);
  const handleOffline = () => api.sync.reportOnlineStatus(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Report initial status
  api.sync.reportOnlineStatus(navigator.onLine);

  // Listen for push-batch requests from main process
  const cleanupPush = api.sync.onPushBatch(async (data) => {
    const { items, responseChannel } = data;
    const results = await handlePushBatch(items);
    api.sync.respondPushBatch(responseChannel, results);
  });

  // Listen for pull-changes requests from main process
  const cleanupPull = api.sync.onPullChanges(async (data) => {
    const { tables, since, responseChannel } = data;
    const results = await handlePullChanges(tables, since);
    api.sync.respondPullChanges(responseChannel, results);
  });

  cleanupFns = [cleanupPush, cleanupPull];

  console.log("[sync-handler] Initialized");

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    console.log("[sync-handler] Cleaned up");
  };
}

// ─── Push Handler ───────────────────────────────────────────────────────────────

async function handlePushBatch(items: SyncPushItem[]): Promise<SyncPushResult[]> {
  if (!supabase) {
    return items.map((item) => ({
      queueId: item.queueId,
      success: false,
      error: "Supabase client not initialized",
    }));
  }

  const results: SyncPushResult[] = [];

  for (const item of items) {
    try {
      // Validate table name
      if (!VALID_TABLES.includes(item.table)) {
        results.push({
          queueId: item.queueId,
          success: false,
          error: `Invalid table: ${item.table}`,
        });
        continue;
      }

      const result = await pushSingleItem(item);
      results.push(result);
    } catch (err: any) {
      results.push({
        queueId: item.queueId,
        success: false,
        error: err.message ?? "Unknown push error",
      });
    }
  }

  return results;
}

async function pushSingleItem(item: SyncPushItem): Promise<SyncPushResult> {
  if (!supabase) {
    return { queueId: item.queueId, success: false, error: "No Supabase client" };
  }

  const { table, recordId, operation, data } = item;

  switch (operation) {
    case "INSERT":
    case "UPDATE": {
      if (!data) {
        return { queueId: item.queueId, success: false, error: "No data for upsert" };
      }

      // Clean the data before sending to Supabase
      const cleanData = cleanForSupabase(data);

      // Check if the record already exists on the server
      const { data: existingRecord, error: fetchError } = await supabase
        .from(table)
        .select("*")
        .eq("id", recordId)
        .maybeSingle();

      if (fetchError) {
        return {
          queueId: item.queueId,
          success: false,
          error: `Fetch error: ${fetchError.message}`,
        };
      }

      // Conflict detection: if server record is newer, server wins
      if (existingRecord && existingRecord.updated_at) {
        const serverTime = new Date(existingRecord.updated_at).getTime();
        const localTime = cleanData.updated_at
          ? new Date(cleanData.updated_at).getTime()
          : 0;

        if (serverTime > localTime) {
          // Server wins — return the server record so main process can update local
          return {
            queueId: item.queueId,
            success: true, // Mark as synced (server already has newer data)
            serverRecord: existingRecord,
          };
        }
      }

      // Upsert to Supabase
      const { error: upsertError } = await supabase.from(table).upsert(cleanData, {
        onConflict: "id",
      });

      if (upsertError) {
        // Handle unique constraint violations (conflict)
        if (
          upsertError.code === "23505" ||
          upsertError.message?.includes("duplicate key")
        ) {
          // Refetch server version
          const { data: serverVersion } = await supabase
            .from(table)
            .select("*")
            .eq("id", recordId)
            .maybeSingle();

          return {
            queueId: item.queueId,
            success: true,
            serverRecord: serverVersion ?? undefined,
          };
        }

        return {
          queueId: item.queueId,
          success: false,
          error: `Upsert error: ${upsertError.message}`,
        };
      }

      return { queueId: item.queueId, success: true };
    }

    case "DELETE": {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", recordId);

      if (deleteError) {
        // If record doesn't exist on server, that's fine — treat as success
        if (
          deleteError.code === "PGRST116" ||
          deleteError.message?.includes("not found")
        ) {
          return { queueId: item.queueId, success: true };
        }

        return {
          queueId: item.queueId,
          success: false,
          error: `Delete error: ${deleteError.message}`,
        };
      }

      return { queueId: item.queueId, success: true };
    }

    default:
      return {
        queueId: item.queueId,
        success: false,
        error: `Unknown operation: ${operation}`,
      };
  }
}

// ─── Pull Handler ───────────────────────────────────────────────────────────────

async function handlePullChanges(
  tables: string[],
  since: string | null,
): Promise<SyncPullResult[]> {
  if (!supabase) {
    console.warn("[sync-handler] Cannot pull: Supabase client not initialized");
    return [];
  }

  const results: SyncPullResult[] = [];

  for (const table of tables) {
    if (!VALID_TABLES.includes(table)) continue;

    try {
      let query = supabase.from(table).select("*");

      // Only fetch records updated since the last sync
      if (since) {
        query = query.gte("updated_at", since);
      }

      // Limit to reasonable batch size
      query = query.limit(1000);

      const { data, error } = await query;

      if (error) {
        console.error(`[sync-handler] Pull error for ${table}:`, error.message);
        continue;
      }

      results.push({
        table,
        records: data ?? [],
      });
    } catch (err: any) {
      console.error(`[sync-handler] Pull exception for ${table}:`, err.message);
    }
  }

  return results;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Clean a record for Supabase by removing SQLite-only columns and
 * ensuring proper data types.
 */
function cleanForSupabase(data: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (STRIP_COLUMNS.has(key)) continue;

    // Convert SQLite integer booleans to actual booleans if needed
    if (value === null || value === undefined) {
      cleaned[key] = null;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}
