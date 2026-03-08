import { app, BrowserWindow, Menu, ipcMain } from "electron";
import path from "path";

const PROTOCOL = "proestimate";

// Register as default protocol handler for proestimate:// links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]!),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function handleDeepLink(url: string) {
  // Validate the deep link URL before forwarding to renderer
  if (!url.startsWith(`${PROTOCOL}://`)) return;

  // Only allow known paths (auth callbacks)
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return; // Malformed URL — ignore
  }
  const allowedPaths = ["/auth/callback", "/auth/confirm"];
  if (!allowedPaths.some((p) => parsed.pathname.startsWith(p))) return;

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    // Forward the validated auth callback URL to the renderer
    mainWindow.webContents.send("deep-link", url);
  }
}

// Register IPC handlers once (outside createWindow to avoid duplicates on macOS activate)
let ipcRegistered = false;
function registerIpcHandlers(getWindow: () => BrowserWindow | undefined) {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle("get-version", () => app.getVersion());
  ipcMain.on("window-minimize", () => getWindow()?.minimize());
  ipcMain.on("window-maximize", () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on("window-close", () => getWindow()?.close());
}

function createWindow() {
  // Remove the default menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  const mainWindow = new BrowserWindow({
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
    title: "ProEstimate AI",
    icon: path.join(__dirname, "../../build/icon.png"),
  });

  registerIpcHandlers(() => BrowserWindow.getAllWindows()[0]);

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

// macOS: handle deep link when app is already running
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
