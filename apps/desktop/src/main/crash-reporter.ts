import { app, dialog, crashReporter } from "electron";
import path from "path";
import fs from "fs";

const LOG_DIR = path.join(app.getPath("userData"), "crash-logs");

export function setupCrashReporter() {
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Start Electron's built-in crash reporter
  crashReporter.start({
    submitURL: "", // No remote reporting — local only for now
    uploadToServer: false,
    compress: false,
  });

  // Handle uncaught exceptions in main process
  process.on("uncaughtException", (error) => {
    writeCrashLog("uncaught-exception", error);
    dialog.showErrorBox(
      "MHP Estimate - Unexpected Error",
      `An unexpected error occurred:\n\n${error.message}\n\nThe app will try to continue, but you may want to restart.`,
    );
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    writeCrashLog("unhandled-rejection", error);
  });

  // Handle renderer process crashes
  app.on("render-process-gone", (_event, _webContents, details) => {
    writeCrashLog("render-process-gone", new Error(`Renderer crashed: ${details.reason}`));
    if (details.reason !== "clean-exit") {
      dialog.showErrorBox(
        "MHP Estimate - Display Error",
        `The display process encountered an issue (${details.reason}).\n\nPlease restart the application.`,
      );
    }
  });

  // Handle GPU process crashes
  app.on("child-process-gone", (_event, details) => {
    if (details.type === "GPU") {
      writeCrashLog("gpu-process-gone", new Error(`GPU process crashed: ${details.reason}`));
    }
  });

  // Clean up old crash logs (keep last 20)
  cleanupOldLogs();
}

function writeCrashLog(type: string, error: Error) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${type}_${timestamp}.json`;
    const logPath = path.join(LOG_DIR, filename);

    const logData = {
      type,
      timestamp: new Date().toISOString(),
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    };

    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  } catch {
    // Don't throw from the crash reporter
    console.error("Failed to write crash log:", error.message);
  }
}

function cleanupOldLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;
    const files = fs
      .readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    // Keep the 20 most recent logs
    for (const file of files.slice(20)) {
      fs.unlinkSync(path.join(LOG_DIR, file));
    }
  } catch {
    // Non-critical — ignore cleanup errors
  }
}

export function getCrashLogs(): string[] {
  try {
    if (!fs.existsSync(LOG_DIR)) return [];
    return fs
      .readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function getCrashLogPath(): string {
  return LOG_DIR;
}
