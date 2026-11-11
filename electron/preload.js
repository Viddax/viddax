/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  executeDownload: (args) => ipcRenderer.invoke('execute_download', args),
  onDownloadProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  getUpdateState: () => ipcRenderer.invoke('get-app-update-state'),
  checkForUpdate: () => ipcRenderer.invoke('check-app-update'),
  installUpdate: () => ipcRenderer.invoke('install-app-update'),
  openReleaseNotes: () => ipcRenderer.invoke('open-app-release-notes'),
  onUpdateState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('app-update-state', listener);
    return () => ipcRenderer.removeListener('app-update-state', listener);
  },
});

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('is-electron');
});
