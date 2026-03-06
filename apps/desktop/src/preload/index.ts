import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Add IPC methods as needed
  getVersion: () => ipcRenderer.invoke("get-version"),
});
