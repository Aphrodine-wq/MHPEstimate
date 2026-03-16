import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import { randomUUID } from "crypto";

const DB_NAME = "proestimate-offline.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath("userData"), DB_NAME);
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read/write performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      estimate_number TEXT,
      project_name TEXT,
      project_type TEXT,
      tier TEXT DEFAULT 'better',
      status TEXT DEFAULT 'draft',
      client_id TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      scope_summary TEXT,
      notes TEXT,
      subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      overhead_rate REAL DEFAULT 0,
      overhead_amount REAL DEFAULT 0,
      contingency_rate REAL DEFAULT 0,
      contingency_amount REAL DEFAULT 0,
      permit_cost REAL DEFAULT 0,
      total REAL DEFAULT 0,
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      user_id TEXT,
      team_id TEXT
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      user_id TEXT,
      team_id TEXT
    );

    CREATE TABLE IF NOT EXISTS estimate_line_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      estimate_id TEXT NOT NULL,
      category TEXT DEFAULT 'materials',
      description TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT DEFAULT 'ea',
      unit_price REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT DEFAULT 'ea',
      default_price REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      user_id TEXT,
      team_id TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      sync_error TEXT,
      retry_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(synced, created_at);
    CREATE INDEX IF NOT EXISTS idx_line_items_estimate ON estimate_line_items(estimate_id);
  `);
}

// ─── CRUD Operations ───────────────────────────────────────────────────────────

export function getAllFromTable(table: string, filters?: Record<string, any>): any[] {
  const db = getDb();
  const validTables = ["estimates", "clients", "estimate_line_items", "products"];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  let sql = `SELECT * FROM ${table}`;
  const params: any[] = [];

  if (filters && Object.keys(filters).length > 0) {
    const conditions = Object.entries(filters).map(([key, _]) => {
      // Whitelist column names to prevent SQL injection
      if (!/^[a-z_]+$/.test(key)) throw new Error(`Invalid column: ${key}`);
      params.push(_);
      return `${key} = ?`;
    });
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += ` ORDER BY updated_at DESC`;
  return db.prepare(sql).all(...params);
}

export function getById(table: string, id: string): any {
  const db = getDb();
  const validTables = ["estimates", "clients", "estimate_line_items", "products"];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

export function upsertRecord(table: string, data: Record<string, any>): any {
  const db = getDb();
  const validTables = ["estimates", "clients", "estimate_line_items", "products"];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  // Ensure ID exists
  if (!data.id) {
    data.id = randomUUID();
  }

  // Set timestamps
  const now = new Date().toISOString();
  data.updated_at = now;
  if (!data.created_at) {
    data.created_at = now;
  }

  // Filter to only valid columns for the table
  const validColumns = getColumnsForTable(table);
  const filtered = Object.entries(data).filter(([key]) => validColumns.includes(key));
  const columns = filtered.map(([key]) => key);
  const placeholders = columns.map(() => "?");
  const values = filtered.map(([_, val]) => (typeof val === "object" && val !== null ? JSON.stringify(val) : val));

  const updateCols = columns
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`);

  const sql = `INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    ON CONFLICT(id) DO UPDATE SET ${updateCols.join(", ")}`;

  db.prepare(sql).run(...values);

  // Queue for sync
  queueSync(table, data.id, "INSERT", data);

  return getById(table, data.id);
}

export function deleteRecord(table: string, id: string): void {
  const db = getDb();
  const validTables = ["estimates", "clients", "estimate_line_items", "products"];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  queueSync(table, id, "DELETE", null);
}

// ─── Sync Queue ────────────────────────────────────────────────────────────────

function queueSync(table: string, recordId: string, operation: string, data: any) {
  const db = getDb();
  db.prepare(
    `INSERT INTO sync_queue (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)`,
  ).run(table, recordId, operation, data ? JSON.stringify(data) : null);
}

export function getPendingSyncItems(): any[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC`)
    .all();
}

export function markSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`UPDATE sync_queue SET synced = 1 WHERE id IN (${placeholders})`).run(
    ...ids,
  );
}

export function markSyncError(id: number, error: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE sync_queue SET sync_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
  ).run(error, id);
}

export function getSyncStatus(): { pending: number; failed: number; lastSync: string | null } {
  const db = getDb();
  const pending = db
    .prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND retry_count < 5`)
    .get() as { count: number };
  const failed = db
    .prepare(`SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND retry_count >= 5`)
    .get() as { count: number };
  const lastSync = db
    .prepare(`SELECT value FROM sync_meta WHERE key = 'last_sync'`)
    .get() as { value: string } | undefined;

  return {
    pending: pending.count,
    failed: failed.count,
    lastSync: lastSync?.value ?? null,
  };
}

export function setLastSync(): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES ('last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
  ).run(now, now);
}

// ─── Bulk Import (for initial sync from Supabase) ──────────────────────────────

export function bulkImport(table: string, records: Record<string, any>[]): void {
  const db = getDb();
  const validTables = ["estimates", "clients", "estimate_line_items", "products"];
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);
  if (records.length === 0) return;

  const validColumns = getColumnsForTable(table);

  const insertMany = db.transaction((items: Record<string, any>[]) => {
    for (const data of items) {
      const filtered = Object.entries(data).filter(([key]) => validColumns.includes(key));
      const columns = filtered.map(([key]) => key);
      const placeholders = columns.map(() => "?");
      const values = filtered.map(([_, val]) =>
        typeof val === "object" && val !== null ? JSON.stringify(val) : val,
      );
      const updateCols = columns
        .filter((c) => c !== "id")
        .map((c) => `${c} = excluded.${c}`);

      db.prepare(
        `INSERT INTO ${table} (${columns.join(", ")})
         VALUES (${placeholders.join(", ")})
         ON CONFLICT(id) DO UPDATE SET ${updateCols.join(", ")}`,
      ).run(...values);
    }
  });

  insertMany(records);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getColumnsForTable(table: string): string[] {
  switch (table) {
    case "estimates":
      return [
        "id", "estimate_number", "project_name", "project_type", "tier", "status",
        "client_id", "address", "city", "state", "zip", "scope_summary", "notes",
        "subtotal", "tax_rate", "tax_amount", "overhead_rate", "overhead_amount",
        "contingency_rate", "contingency_amount", "permit_cost", "total",
        "valid_until", "created_at", "updated_at", "user_id", "team_id",
      ];
    case "clients":
      return [
        "id", "name", "email", "phone", "company", "address", "city", "state",
        "zip", "notes", "created_at", "updated_at", "user_id", "team_id",
      ];
    case "estimate_line_items":
      return [
        "id", "estimate_id", "category", "description", "quantity", "unit",
        "unit_price", "total", "sort_order", "created_at", "updated_at",
      ];
    case "products":
      return [
        "id", "name", "category", "unit", "default_price", "description",
        "created_at", "updated_at", "user_id", "team_id",
      ];
    default:
      return [];
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
