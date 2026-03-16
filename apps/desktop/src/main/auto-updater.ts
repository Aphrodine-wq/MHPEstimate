import { autoUpdater, UpdateInfo } from "electron-updater";
import { BrowserWindow } from "electron";
import log from "electron-log";

// Configure logging
autoUpdater.logger = log;

// Don't auto-download — let the user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

type UpdateStatus = {
  status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  info?: UpdateInfo;
  error?: string;
  progress?: { percent: number };
};

function sendStatus(getWindow: () => BrowserWindow | undefined, update: UpdateStatus) {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-status", update);
  }
}

export function setupAutoUpdater(getWindow: () => BrowserWindow | undefined) {
  autoUpdater.on("checking-for-update", () => {
    sendStatus(getWindow, { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus(getWindow, { status: "available", info });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus(getWindow, { status: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus(getWindow, {
      status: "downloading",
      progress: { percent: Math.round(progress.percent) },
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendStatus(getWindow, { status: "downloaded", info });
  });

  autoUpdater.on("error", (err) => {
    sendStatus(getWindow, { status: "error", error: err?.message ?? "Update error" });
  });

  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail — no update server configured yet
    });
  }, 5000);

  // Check periodically (every 30 minutes)
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(() => {});
    },
    30 * 60 * 1000,
  );
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export function downloadUpdate() {
  return autoUpdater.downloadUpdate();
}

export function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}
