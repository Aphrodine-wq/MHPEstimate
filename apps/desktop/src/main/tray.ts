import { Tray, Menu, nativeImage, app, BrowserWindow } from "electron";
import path from "path";

let tray: Tray | null = null;

export function setupTray(getWindow: () => BrowserWindow | undefined): Tray {
  // Create tray icon — use template image on macOS for proper menu bar appearance
  const iconPath = path.join(__dirname, "../../build/icon.png");
  let icon = nativeImage.createFromPath(iconPath);
  // Resize for tray (16x16 on macOS, 24x24 on Windows/Linux)
  const size = process.platform === "darwin" ? 16 : 24;
  icon = icon.resize({ width: size, height: size });
  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip("ProEstimate AI");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open ProEstimate",
      click: () => {
        const win = getWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "New Estimate",
      click: () => {
        const win = getWindow();
        if (win) {
          win.show();
          win.focus();
          win.webContents.send("menu-action", "new-estimate");
        }
      },
    },
    {
      label: "Call Alex",
      click: () => {
        const win = getWindow();
        if (win) {
          win.show();
          win.focus();
          win.webContents.send("menu-action", "call-alex");
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit ProEstimate",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click to show/hide window (macOS: left-click shows menu, this is for double-click)
  tray.on("double-click", () => {
    const win = getWindow();
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    }
  });

  return tray;
}

export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
