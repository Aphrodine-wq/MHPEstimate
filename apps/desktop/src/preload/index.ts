import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // ─── Window Controls (existing) ────────────────────────────────
  getVersion: () => ipcRenderer.invoke("get-version"),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // ─── Deep Link (existing) ─────────────────────────────────────
  onDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on("deep-link", handler);
    return () => {
      ipcRenderer.removeListener("deep-link", handler);
    };
  },

  // ─── Menu Actions ─────────────────────────────────────────────
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on("menu-action", handler);
    return () => {
      ipcRenderer.removeListener("menu-action", handler);
    };
  },

  // ─── Auto-Update ──────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: any) => callback(status);
    ipcRenderer.on("update-status", handler);
    return () => {
      ipcRenderer.removeListener("update-status", handler);
    };
  },

  // ─── File System ──────────────────────────────────────────────
  saveFile: (options: { data: Uint8Array | string; filename: string; filters?: any[] }) =>
    ipcRenderer.invoke("save-file", options),
  openFile: (options: { filters?: any[] }) => ipcRenderer.invoke("open-file", options),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke("show-item-in-folder", filePath),

  // ─── File Open Events (drag-drop / Finder "Open With") ───────
  onFileOpened: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on("file-opened", handler);
    return () => {
      ipcRenderer.removeListener("file-opened", handler);
    };
  },

  // ─── System Notifications ─────────────────────────────────────
  showNotification: (options: { title: string; body: string; silent?: boolean }) =>
    ipcRenderer.invoke("show-notification", options),

  // ─── Offline Store ────────────────────────────────────────────
  offline: {
    getAll: (table: string, filters?: Record<string, any>) =>
      ipcRenderer.invoke("offline:get-all", { table, filters }),
    getById: (table: string, id: string) =>
      ipcRenderer.invoke("offline:get-by-id", { table, id }),
    upsert: (table: string, data: Record<string, any>) =>
      ipcRenderer.invoke("offline:upsert", { table, data }),
    delete: (table: string, id: string) =>
      ipcRenderer.invoke("offline:delete", { table, id }),
    getPendingSync: () => ipcRenderer.invoke("offline:get-pending-sync"),
    markSynced: (ids: number[]) => ipcRenderer.invoke("offline:mark-synced", { ids }),
    markSyncError: (id: number, error: string) =>
      ipcRenderer.invoke("offline:mark-sync-error", { id, error }),
    getSyncStatus: () => ipcRenderer.invoke("offline:get-sync-status"),
    setLastSync: () => ipcRenderer.invoke("offline:set-last-sync"),
    bulkImport: (table: string, records: Record<string, any>[]) =>
      ipcRenderer.invoke("offline:bulk-import", { table, records }),
  },

  // ─── Online/Offline Status ────────────────────────────────────
  onOnlineStatus: (callback: (online: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, online: boolean) => callback(online);
    ipcRenderer.on("online-status", handler);
    return () => {
      ipcRenderer.removeListener("online-status", handler);
    };
  },

  // ─── Background Sync Engine ────────────────────────────────────
  sync: {
    /** Manually trigger a sync cycle */
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    /** Get current sync engine status */
    getStatus: () => ipcRenderer.invoke("sync:get-status"),
    /** Report browser-level online/offline status to main process */
    reportOnlineStatus: (online: boolean) =>
      ipcRenderer.send("sync:report-online-status", online),
    /** Listen for sync status updates from the engine */
    onSyncStatus: (callback: (status: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: any) => callback(status);
      ipcRenderer.on("sync:status", handler);
      return () => {
        ipcRenderer.removeListener("sync:status", handler);
      };
    },
    /** Listen for push-batch requests from the sync engine */
    onPushBatch: (callback: (data: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on("sync:push-batch", handler);
      return () => {
        ipcRenderer.removeListener("sync:push-batch", handler);
      };
    },
    /** Respond to a push-batch request */
    respondPushBatch: (responseChannel: string, results: any[]) =>
      ipcRenderer.send(responseChannel, results),
    /** Listen for pull-changes requests from the sync engine */
    onPullChanges: (callback: (data: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on("sync:pull-changes", handler);
      return () => {
        ipcRenderer.removeListener("sync:pull-changes", handler);
      };
    },
    /** Respond to a pull-changes request */
    respondPullChanges: (responseChannel: string, results: any[]) =>
      ipcRenderer.send(responseChannel, results),
    /** Listen for local-data-updated events (after server pull) */
    onLocalDataUpdated: (callback: (data: { tables: string[] }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { tables: string[] }) =>
        callback(data);
      ipcRenderer.on("sync:local-data-updated", handler);
      return () => {
        ipcRenderer.removeListener("sync:local-data-updated", handler);
      };
    },
  },

  // ─── Crash Reporting ──────────────────────────────────────────
  reportError: (error: { message: string; stack?: string }) =>
    ipcRenderer.invoke("report-renderer-error", error),
  getCrashLogPath: () => ipcRenderer.invoke("get-crash-log-path"),

  // ─── Misc ─────────────────────────────────────────────────────
  getAppPath: (name: string) => ipcRenderer.invoke("get-app-path", name),
});
