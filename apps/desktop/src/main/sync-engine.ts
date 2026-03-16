/**
 * Background Sync Engine
 *
 * Runs in the Electron main process. Periodically reads the sync_queue from
 * the local SQLite database, groups items by table/operation, and delegates the
 * actual Supabase push to the renderer process (which holds the authenticated
 * Supabase client). The renderer responds with success/failure per item, and
 * this module updates the queue accordingly.
 *
 * Architecture:
 *   Main (sync-engine)  ──IPC──►  Renderer (supabase client)
 *     ↕ SQLite                      ↕ Supabase REST API
 *   offline-store.ts               Supabase cloud
 *
 * Features:
 *   - 30-second sync interval when online
 *   - Network connectivity monitoring
 *   - Exponential backoff for failed items (max 5 retries)
 *   - Server-wins conflict resolution with local backup
 *   - Real-time status events to renderer for UI indicators
 *   - Pull-based sync (server → local) after successful push
 */

import { BrowserWindow, ipcMain, net } from "electron";
import log from "electron-log";
import {
  getPendingSyncItems,
  markSynced,
  markSyncError,
  getSyncStatus,
  setLastSync,
  bulkImport,
  getById,
  getDb,
} from "./offline-store";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  state: "idle" | "syncing" | "error" | "offline";
  pending: number;
  failed: number;
  lastSync: string | null;
  /** Currently syncing item description, if any */
  currentItem?: string;
  /** Last error message, if any */
  lastError?: string;
}

interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: string | null;
  created_at: string;
  synced: number;
  sync_error: string | null;
  retry_count: number;
}

interface SyncPushResult {
  queueId: number;
  success: boolean;
  error?: string;
  /** If server-wins conflict, this contains the server version of the record */
  serverRecord?: Record<string, any>;
}

interface SyncPullResult {
  table: string;
  records: Record<string, any>[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const CONNECTIVITY_CHECK_INTERVAL_MS = 10_000; // 10 seconds
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2_000; // 2 seconds
const MAX_BATCH_SIZE = 50; // Max items to sync per cycle
const PULL_TABLES = ["estimates", "clients", "estimate_line_items", "products"];

// ─── State ──────────────────────────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setInterval> | null = null;
let connectivityTimer: ReturnType<typeof setInterval> | null = null;
let isOnline = true;
let isSyncing = false;
let getWindowFn: (() => BrowserWindow | undefined) | null = null;
let currentStatus: SyncStatus = {
  state: "idle",
  pending: 0,
  failed: 0,
  lastSync: null,
};

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initialize the sync engine. Call once after the main window is created.
 */
export function setupSyncEngine(getWindow: () => BrowserWindow | undefined): void {
  getWindowFn = getWindow;

  // Register IPC handlers for renderer ↔ main sync communication
  registerSyncIpcHandlers();

  // Start connectivity monitoring
  startConnectivityMonitor();

  // Start the sync loop after a short delay to let the renderer initialize
  setTimeout(() => {
    startSyncLoop();
    // Do an initial sync check
    runSyncCycle().catch((err) => {
      log.warn("[sync-engine] Initial sync cycle failed:", err.message);
    });
  }, 8_000);

  log.info("[sync-engine] Initialized");
}

/**
 * Stop the sync engine. Call on app quit.
 */
export function stopSyncEngine(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  if (connectivityTimer) {
    clearInterval(connectivityTimer);
    connectivityTimer = null;
  }
  log.info("[sync-engine] Stopped");
}

/**
 * Manually trigger a sync cycle (e.g., when coming back online).
 */
export async function triggerSync(): Promise<SyncStatus> {
  if (!isOnline) {
    return { ...currentStatus, state: "offline" };
  }
  await runSyncCycle();
  return { ...currentStatus };
}

/**
 * Get the current sync status.
 */
export function getCurrentSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

// ─── Sync Loop ──────────────────────────────────────────────────────────────────

function startSyncLoop(): void {
  if (syncTimer) return;

  syncTimer = setInterval(() => {
    if (isOnline && !isSyncing) {
      runSyncCycle().catch((err) => {
        log.error("[sync-engine] Sync cycle error:", err.message);
      });
    }
  }, SYNC_INTERVAL_MS);

  log.info(`[sync-engine] Sync loop started (${SYNC_INTERVAL_MS / 1000}s interval)`);
}

async function runSyncCycle(): Promise<void> {
  if (isSyncing) {
    log.debug("[sync-engine] Sync already in progress, skipping");
    return;
  }
  if (!isOnline) {
    updateStatus({ state: "offline" });
    return;
  }

  isSyncing = true;
  updateStatus({ state: "syncing" });

  try {
    // Phase 1: Push local changes to server
    await pushChanges();

    // Phase 2: Pull server changes to local (only if push had no fatal errors)
    if (currentStatus.state !== "error") {
      await pullChanges();
    }

    // Update last sync timestamp
    setLastSync();

    // Refresh status from DB
    const dbStatus = getSyncStatus();
    updateStatus({
      state: dbStatus.pending > 0 ? "syncing" : "idle",
      pending: dbStatus.pending,
      failed: dbStatus.failed,
      lastSync: dbStatus.lastSync,
      currentItem: undefined,
      lastError: undefined,
    });
  } catch (err: any) {
    log.error("[sync-engine] Sync cycle failed:", err.message);
    updateStatus({
      state: "error",
      lastError: err.message,
    });
  } finally {
    isSyncing = false;
  }
}

// ─── Push Phase ─────────────────────────────────────────────────────────────────

async function pushChanges(): Promise<void> {
  const pendingItems = getPendingSyncItems() as SyncQueueItem[];

  if (pendingItems.length === 0) {
    log.debug("[sync-engine] No pending items to push");
    return;
  }

  // Filter out items that have exceeded max retries
  const eligibleItems = pendingItems.filter((item) => item.retry_count < MAX_RETRIES);

  if (eligibleItems.length === 0) {
    log.debug("[sync-engine] All pending items exceeded max retries");
    return;
  }

  // Filter out items that should still be in backoff
  const readyItems = eligibleItems.filter((item) => {
    if (item.retry_count === 0) return true;
    const backoffMs = calculateBackoff(item.retry_count);
    const lastAttempt = new Date(item.created_at).getTime();
    return Date.now() - lastAttempt > backoffMs;
  });

  if (readyItems.length === 0) {
    log.debug("[sync-engine] All eligible items are in backoff");
    return;
  }

  // Take a batch
  const batch = readyItems.slice(0, MAX_BATCH_SIZE);

  log.info(`[sync-engine] Pushing ${batch.length} items to server`);
  updateStatus({
    state: "syncing",
    pending: pendingItems.length,
    currentItem: `Pushing ${batch.length} change${batch.length !== 1 ? "s" : ""}`,
  });

  // Send batch to renderer for Supabase push
  const results = await sendToRenderer("sync:push-batch", {
    items: batch.map((item) => ({
      queueId: item.id,
      table: item.table_name,
      recordId: item.record_id,
      operation: item.operation,
      data: item.data ? JSON.parse(item.data) : null,
    })),
  });

  if (!results || !Array.isArray(results)) {
    log.warn("[sync-engine] No response from renderer for push batch");
    return;
  }

  // Process results
  const succeededIds: number[] = [];
  for (const result of results as SyncPushResult[]) {
    if (result.success) {
      succeededIds.push(result.queueId);

      // If server sent back a record (conflict resolution), update local copy
      if (result.serverRecord) {
        const item = batch.find((b) => b.id === result.queueId);
        if (item) {
          backupAndApplyServerRecord(item.table_name, item.record_id, result.serverRecord);
        }
      }
    } else {
      log.warn(
        `[sync-engine] Sync failed for queue item ${result.queueId}: ${result.error}`,
      );
      markSyncError(result.queueId, result.error ?? "Unknown error");
    }
  }

  if (succeededIds.length > 0) {
    markSynced(succeededIds);
    log.info(`[sync-engine] Successfully synced ${succeededIds.length} items`);
  }
}

// ─── Pull Phase ─────────────────────────────────────────────────────────────────

async function pullChanges(): Promise<void> {
  updateStatus({ currentItem: "Pulling server changes" });

  const dbStatus = getSyncStatus();
  const lastSync = dbStatus.lastSync;

  // Request the renderer to pull changes from Supabase
  const results = await sendToRenderer("sync:pull-changes", {
    tables: PULL_TABLES,
    since: lastSync,
  });

  if (!results || !Array.isArray(results)) {
    log.debug("[sync-engine] No pull results from renderer");
    return;
  }

  let totalImported = 0;

  for (const tableResult of results as SyncPullResult[]) {
    if (tableResult.records && tableResult.records.length > 0) {
      // Use bulkImport which does UPSERT — server-wins by overwriting local
      bulkImport(tableResult.table, tableResult.records);
      totalImported += tableResult.records.length;
    }
  }

  if (totalImported > 0) {
    log.info(`[sync-engine] Pulled ${totalImported} records from server`);
    // Notify renderer that local data was updated from server
    emitToRenderer("sync:local-data-updated", { tables: PULL_TABLES });
  }
}

// ─── Conflict Resolution ────────────────────────────────────────────────────────

/**
 * Server-wins conflict resolution: backs up the local record to a conflict
 * table, then overwrites it with the server version.
 */
function backupAndApplyServerRecord(
  table: string,
  recordId: string,
  serverRecord: Record<string, any>,
): void {
  try {
    const db = getDb();
    const localRecord = getById(table, recordId);

    if (localRecord) {
      // Save local version to conflict backup
      ensureConflictTable(db);
      db.prepare(
        `INSERT INTO sync_conflicts (table_name, record_id, local_data, server_data, resolved_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
      ).run(
        table,
        recordId,
        JSON.stringify(localRecord),
        JSON.stringify(serverRecord),
      );
    }

    // Apply server version via bulkImport (UPSERT)
    bulkImport(table, [serverRecord]);

    log.info(`[sync-engine] Conflict resolved (server-wins) for ${table}/${recordId}`);
  } catch (err: any) {
    log.error(`[sync-engine] Failed to apply server record for ${table}/${recordId}:`, err.message);
  }
}

function ensureConflictTable(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_data TEXT,
      server_data TEXT,
      resolved_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

// ─── Connectivity Monitoring ────────────────────────────────────────────────────

function startConnectivityMonitor(): void {
  if (connectivityTimer) return;

  // Use Electron's net.isOnline() for connectivity detection
  isOnline = net.isOnline();
  log.info(`[sync-engine] Initial network status: ${isOnline ? "online" : "offline"}`);

  connectivityTimer = setInterval(() => {
    const wasOnline = isOnline;
    isOnline = net.isOnline();

    if (wasOnline !== isOnline) {
      log.info(`[sync-engine] Network status changed: ${isOnline ? "online" : "offline"}`);
      emitToRenderer("online-status", isOnline);

      if (isOnline) {
        // Just came back online — trigger immediate sync
        updateStatus({ state: "syncing", currentItem: "Reconnected, syncing..." });
        runSyncCycle().catch((err) => {
          log.warn("[sync-engine] Post-reconnect sync failed:", err.message);
        });
      } else {
        updateStatus({ state: "offline" });
      }
    }
  }, CONNECTIVITY_CHECK_INTERVAL_MS);
}

// ─── Exponential Backoff ────────────────────────────────────────────────────────

function calculateBackoff(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s, 16s, 32s (capped at 32s)
  const backoff = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
  const maxBackoff = 32_000;
  // Add jitter (0-25% of backoff) to prevent thundering herd
  const jitter = Math.random() * backoff * 0.25;
  return Math.min(backoff + jitter, maxBackoff + jitter);
}

// ─── IPC Communication ──────────────────────────────────────────────────────────

/**
 * Register IPC handlers that the renderer can call.
 */
function registerSyncIpcHandlers(): void {
  // Renderer requests a manual sync
  ipcMain.handle("sync:trigger", async () => {
    return triggerSync();
  });

  // Renderer reports its online/offline status (browser-level)
  ipcMain.on("sync:report-online-status", (_event, online: boolean) => {
    const wasOnline = isOnline;
    isOnline = online;
    if (!wasOnline && online) {
      log.info("[sync-engine] Renderer reports online — triggering sync");
      runSyncCycle().catch((err) => {
        log.warn("[sync-engine] Post-reconnect sync failed:", err.message);
      });
    } else if (wasOnline && !online) {
      updateStatus({ state: "offline" });
    }
  });

  // Renderer can provide auth credentials for main-process use
  ipcMain.handle("sync:get-status", () => {
    return getCurrentSyncStatus();
  });

  // Renderer responds to push/pull requests via these handlers.
  // (The actual push/pull IPC is request-response via sendToRenderer.)
}

/**
 * Send a message to the renderer and wait for a response.
 * Uses a request-response pattern via IPC.
 */
function sendToRenderer(channel: string, data: any): Promise<any> {
  return new Promise((resolve) => {
    const win = getWindowFn?.();
    if (!win || win.isDestroyed()) {
      log.warn(`[sync-engine] No window available for ${channel}`);
      resolve(null);
      return;
    }

    // Generate a unique response channel
    const responseChannel = `${channel}:response:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    // Set up one-time response listener
    const timeout = setTimeout(() => {
      ipcMain.removeAllListeners(responseChannel);
      log.warn(`[sync-engine] Timeout waiting for renderer response on ${channel}`);
      resolve(null);
    }, 60_000); // 60 second timeout for batch operations

    ipcMain.once(responseChannel, (_event, responseData) => {
      clearTimeout(timeout);
      resolve(responseData);
    });

    // Send request to renderer
    win.webContents.send(channel, { ...data, responseChannel });
  });
}

/**
 * Emit an event to the renderer (fire-and-forget).
 */
function emitToRenderer(channel: string, data: any): void {
  const win = getWindowFn?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

// ─── Status Management ──────────────────────────────────────────────────────────

function updateStatus(partial: Partial<SyncStatus>): void {
  // Merge with DB-sourced counts if not provided
  if (partial.pending === undefined || partial.failed === undefined) {
    try {
      const dbStatus = getSyncStatus();
      if (partial.pending === undefined) partial.pending = dbStatus.pending;
      if (partial.failed === undefined) partial.failed = dbStatus.failed;
      if (partial.lastSync === undefined) partial.lastSync = dbStatus.lastSync;
    } catch {
      // DB might not be initialized yet
    }
  }

  currentStatus = { ...currentStatus, ...partial };
  emitToRenderer("sync:status", currentStatus);
}
