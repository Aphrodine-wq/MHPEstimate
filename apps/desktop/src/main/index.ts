import { app, BrowserWindow, Menu, ipcMain, dialog, Notification, shell } from "electron";
import path from "path";
import { buildMenu } from "./menu";
import { setupTray, destroyTray } from "./tray";
import { setupAutoUpdater, checkForUpdates, downloadUpdate, installUpdate } from "./auto-updater";
import { setupCrashReporter, getCrashLogPath } from "./crash-reporter";
import { setupSyncEngine, stopSyncEngine } from "./sync-engine";
import {
  getDb,
  getAllFromTable,
  getById,
  upsertRecord,
  deleteRecord,
  getPendingSyncItems,
  markSynced,
  markSyncError,
  getSyncStatus,
  setLastSync,
  bulkImport,
  closeDb,
} from "./offline-store";

const PROTOCOL = "proestimate";

// ─── Protocol Registration ─────────────────────────────────────────────────────

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]!),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// ─── Deep Link Handling ────────────────────────────────────────────────────────

function handleDeepLink(url: string) {
  if (!url.startsWith(`${PROTOCOL}://`)) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const allowedPaths = ["/auth/callback", "/auth/confirm"];
  if (!allowedPaths.some((p) => parsed.pathname.startsWith(p))) return;

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send("deep-link", url);
  }
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────────

let ipcRegistered = false;

function registerIpcHandlers(getWindow: () => BrowserWindow | undefined) {
  if (ipcRegistered) return;
  ipcRegistered = true;

  // Window controls
  ipcMain.handle("get-version", () => app.getVersion());
  ipcMain.on("window-minimize", () => getWindow()?.minimize());
  ipcMain.on("window-maximize", () => {
    const win = getWindow();
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on("window-close", () => getWindow()?.close());

  // ─── Auto-updater ──────────────────────────────────────────────
  ipcMain.handle("check-for-updates", () => checkForUpdates());
  ipcMain.handle("download-update", () => downloadUpdate());
  ipcMain.on("install-update", () => installUpdate());

  // ─── File system dialogs ───────────────────────────────────────
  ipcMain.handle("save-file", async (_event, { data, filename, filters }) => {
    const win = getWindow();
    if (!win) return null;

    const result = await dialog.showSaveDialog(win, {
      defaultPath: filename,
      filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
    });

    if (result.canceled || !result.filePath) return null;

    const fs = await import("fs");
    // data can be a Buffer (passed as Uint8Array through IPC) or a string
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    fs.writeFileSync(result.filePath, buffer);
    return result.filePath;
  });

  ipcMain.handle("open-file", async (_event, { filters }) => {
    const win = getWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      filters: filters ?? [{ name: "All Files", extensions: ["*"] }],
      properties: ["openFile"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const fs = await import("fs");
    const filePath = result.filePaths[0]!;
    const buffer = fs.readFileSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      data: buffer.toString("base64"),
    };
  });

  ipcMain.handle("show-item-in-folder", (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  // ─── System notifications ─────────────────────────────────────
  ipcMain.handle("show-notification", (_event, { title, body, silent }) => {
    if (!Notification.isSupported()) return false;
    const notification = new Notification({
      title,
      body,
      silent: silent ?? false,
      icon: path.join(__dirname, "../../build/icon.png"),
    });
    notification.on("click", () => {
      const win = getWindow();
      if (win) {
        win.show();
        win.focus();
      }
    });
    notification.show();
    return true;
  });

  // ─── Offline store ────────────────────────────────────────────
  ipcMain.handle("offline:get-all", (_event, { table, filters }) => {
    return getAllFromTable(table, filters);
  });

  ipcMain.handle("offline:get-by-id", (_event, { table, id }) => {
    return getById(table, id);
  });

  ipcMain.handle("offline:upsert", (_event, { table, data }) => {
    return upsertRecord(table, data);
  });

  ipcMain.handle("offline:delete", (_event, { table, id }) => {
    deleteRecord(table, id);
    return true;
  });

  ipcMain.handle("offline:get-pending-sync", () => {
    return getPendingSyncItems();
  });

  ipcMain.handle("offline:mark-synced", (_event, { ids }) => {
    markSynced(ids);
    return true;
  });

  ipcMain.handle("offline:mark-sync-error", (_event, { id, error }) => {
    markSyncError(id, error);
    return true;
  });

  ipcMain.handle("offline:get-sync-status", () => {
    return getSyncStatus();
  });

  ipcMain.handle("offline:set-last-sync", () => {
    setLastSync();
    return true;
  });

  ipcMain.handle("offline:bulk-import", (_event, { table, records }) => {
    bulkImport(table, records);
    return true;
  });

  // ─── Crash reporting ──────────────────────────────────────────
  ipcMain.handle("get-crash-log-path", () => getCrashLogPath());

  ipcMain.handle("report-renderer-error", (_event, { message, stack }) => {
    const fs = require("fs") as typeof import("fs");
    const logDir = getCrashLogPath();
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logPath = path.join(logDir, `renderer-error_${timestamp}.json`);
    fs.writeFileSync(
      logPath,
      JSON.stringify(
        {
          type: "renderer-error",
          timestamp: new Date().toISOString(),
          appVersion: app.getVersion(),
          error: { message, stack },
        },
        null,
        2,
      ),
    );
    return true;
  });

  // ─── Misc ─────────────────────────────────────────────────────
  ipcMain.handle("get-app-path", (_event, name: string) => {
    return app.getPath(name as any);
  });
}

// ─── Window Creation ───────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    frame: false,
    titleBarStyle: "hidden",
    title: "MHP Estimate",
    icon: path.join(__dirname, "../../build/icon.png"),
    show: false, // Show when ready to prevent flash
  });

  const getWindow = () => BrowserWindow.getAllWindows()[0];

  // Register IPC handlers
  registerIpcHandlers(getWindow);

  // Set up native application menu
  const menu = buildMenu(getWindow);
  Menu.setApplicationMenu(menu);

  // Set up system tray
  setupTray(getWindow);

  // Set up auto-updater
  setupAutoUpdater(getWindow);

  // Set up background sync engine
  setupSyncEngine(getWindow);

  // Initialize offline database
  try {
    getDb();
  } catch (err) {
    console.error("Failed to initialize offline database:", err);
  }

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Handle window close — hide to tray on macOS instead of quitting
  mainWindow.on("close", (event) => {
    if (process.platform === "darwin" && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Track online/offline status
  mainWindow.webContents.on("did-finish-load", () => {
    // Send initial online status
    mainWindow?.webContents.send("online-status", true);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

let isQuitting = false;

app.on("before-quit", () => {
  isQuitting = true;
});

// macOS: handle deep link when app is already running
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// macOS: handle file drop / open with
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send("file-opened", filePath);
  }
});

app.whenReady().then(() => {
  // Setup crash reporter early
  setupCrashReporter();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // Show window if it was hidden to tray
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopSyncEngine();
    closeDb();
    destroyTray();
    app.quit();
  }
});

app.on("will-quit", () => {
  stopSyncEngine();
  closeDb();
  destroyTray();
});
