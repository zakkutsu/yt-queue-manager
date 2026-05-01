const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  openLink: (url) => ipcRenderer.invoke('open-link', url),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  checkSubscribe: () => ipcRenderer.invoke('check-subscribe'),
  autoSubscribe: () => ipcRenderer.invoke('auto-subscribe'),
  debugLog: (message, details) => ipcRenderer.invoke('debug-log', { message, details })
})