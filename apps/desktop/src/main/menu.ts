import { app, Menu, shell, BrowserWindow } from "electron";

export function buildMenu(getWindow: () => BrowserWindow | undefined): Menu {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Check for Updates…",
                click: () => getWindow()?.webContents.send("menu-action", "check-updates"),
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),

    // File
    {
      label: "File",
      submenu: [
        {
          label: "New Estimate",
          accelerator: "CmdOrCtrl+N",
          click: () => getWindow()?.webContents.send("menu-action", "new-estimate"),
        },
        { type: "separator" },
        {
          label: "Export PDF…",
          accelerator: "CmdOrCtrl+E",
          click: () => getWindow()?.webContents.send("menu-action", "export-pdf"),
        },
        {
          label: "Save PDF to Disk…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => getWindow()?.webContents.send("menu-action", "save-pdf"),
        },
        { type: "separator" },
        {
          label: "Import Moasure File…",
          click: () => getWindow()?.webContents.send("menu-action", "import-moasure"),
        },
        {
          label: "Import Building Plan…",
          click: () => getWindow()?.webContents.send("menu-action", "import-plan"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },

    // Edit
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // View
    {
      label: "View",
      submenu: [
        {
          label: "Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => getWindow()?.webContents.send("menu-action", "navigate:dashboard"),
        },
        {
          label: "Estimates",
          accelerator: "CmdOrCtrl+2",
          click: () => getWindow()?.webContents.send("menu-action", "navigate:estimates"),
        },
        {
          label: "Materials",
          accelerator: "CmdOrCtrl+3",
          click: () => getWindow()?.webContents.send("menu-action", "navigate:materials"),
        },
        {
          label: "Clients",
          accelerator: "CmdOrCtrl+4",
          click: () => getWindow()?.webContents.send("menu-action", "navigate:clients"),
        },
        {
          label: "Analytics",
          accelerator: "CmdOrCtrl+5",
          click: () => getWindow()?.webContents.send("menu-action", "navigate:analytics"),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Window
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },

    // Help
    {
      label: "Help",
      submenu: [
        {
          label: "ProEstimate Documentation",
          click: () => shell.openExternal("https://mhpestimate.cloud/docs"),
        },
        {
          label: "MHP Construction Website",
          click: () => shell.openExternal("https://northmshomepros.com"),
        },
        { type: "separator" },
        {
          label: "Report a Problem…",
          click: () => getWindow()?.webContents.send("menu-action", "report-problem"),
        },
        ...(!isMac
          ? [
              { type: "separator" as const },
              {
                label: "Check for Updates…",
                click: () => getWindow()?.webContents.send("menu-action", "check-updates"),
              },
              { type: "separator" as const },
              { role: "about" as const },
            ]
          : []),
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
