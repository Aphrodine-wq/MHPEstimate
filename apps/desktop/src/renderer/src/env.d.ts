/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ELEVENLABS_AGENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface OfflineAPI {
  getAll: (table: string, filters?: Record<string, any>) => Promise<any[]>;
  getById: (table: string, id: string) => Promise<any>;
  upsert: (table: string, data: Record<string, any>) => Promise<any>;
  delete: (table: string, id: string) => Promise<boolean>;
  getPendingSync: () => Promise<any[]>;
  markSynced: (ids: number[]) => Promise<boolean>;
  markSyncError: (id: number, error: string) => Promise<boolean>;
  getSyncStatus: () => Promise<{ pending: number; failed: number; lastSync: string | null }>;
  setLastSync: () => Promise<boolean>;
  bulkImport: (table: string, records: Record<string, any>[]) => Promise<boolean>;
}

interface UpdateStatus {
  status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  info?: { version?: string; releaseDate?: string; releaseNotes?: string };
  error?: string;
  progress?: { percent: number };
}

interface SyncStatus {
  state: "idle" | "syncing" | "error" | "offline";
  pending: number;
  failed: number;
  lastSync: string | null;
  currentItem?: string;
  lastError?: string;
}

interface SyncPushItem {
  queueId: number;
  table: string;
  recordId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, any> | null;
}

interface SyncPushBatchRequest {
  items: SyncPushItem[];
  responseChannel: string;
}

interface SyncPushResult {
  queueId: number;
  success: boolean;
  error?: string;
  serverRecord?: Record<string, any>;
}

interface SyncPullRequest {
  tables: string[];
  since: string | null;
  responseChannel: string;
}

interface SyncPullResult {
  table: string;
  records: Record<string, any>[];
}

interface SyncAPI {
  trigger: () => Promise<SyncStatus>;
  getStatus: () => Promise<SyncStatus>;
  reportOnlineStatus: (online: boolean) => void;
  onSyncStatus: (callback: (status: SyncStatus) => void) => (() => void);
  onPushBatch: (callback: (data: SyncPushBatchRequest) => void) => (() => void);
  respondPushBatch: (responseChannel: string, results: SyncPushResult[]) => void;
  onPullChanges: (callback: (data: SyncPullRequest) => void) => (() => void);
  respondPullChanges: (responseChannel: string, results: SyncPullResult[]) => void;
  onLocalDataUpdated: (callback: (data: { tables: string[] }) => void) => (() => void);
}

interface FileFilter {
  name: string;
  extensions: string[];
}

interface ElectronAPI {
  // Window controls
  getVersion: () => Promise<string>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;

  // Deep links
  onDeepLink: (callback: (url: string) => void) => (() => void);

  // Menu actions
  onMenuAction: (callback: (action: string) => void) => (() => void);

  // Auto-update
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  installUpdate: () => void;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => (() => void);

  // File system
  saveFile: (options: { data: Uint8Array | string; filename: string; filters?: FileFilter[] }) => Promise<string | null>;
  openFile: (options: { filters?: FileFilter[] }) => Promise<{ path: string; name: string; data: string } | null>;
  showItemInFolder: (filePath: string) => Promise<void>;
  onFileOpened: (callback: (filePath: string) => void) => (() => void);

  // System notifications
  showNotification: (options: { title: string; body: string; silent?: boolean }) => Promise<boolean>;

  // Offline store
  offline: OfflineAPI;

  // Background sync engine
  sync: SyncAPI;

  // Online/offline status
  onOnlineStatus: (callback: (online: boolean) => void) => (() => void);

  // Crash reporting
  reportError: (error: { message: string; stack?: string }) => Promise<boolean>;
  getCrashLogPath: () => Promise<string>;

  // Misc
  getAppPath: (name: string) => Promise<string>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
