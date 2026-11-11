/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const { downloadMedia } = require('./download_engine');
const { createUpdateController } = require('./app_updates');
const serve = require('electron-serve').default || require('electron-serve');
const os = require('os');

const loadURL = serve({ directory: path.join(__dirname, '../out') });

const isDev = process.env.NODE_ENV === 'development';
let activeDownloads = 0;
const updates = createUpdateController({
  updater: autoUpdater,
  currentVersion: app.getVersion(),
  enabled: app.isPackaged && process.platform === 'win32',
  canRestart: () => activeDownloads === 0,
  publish: (state) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.webContents.isDestroyed()) window.webContents.send('app-update-state', state);
    }
  },
});

// Disable hardware acceleration to prevent GPU crashes on some systems
app.disableHardwareAcceleration();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:3000');
  } else {
    loadURL(mainWindow);
  }
  return mainWindow;
}

function autoUpdateYtdlp() {
  try {
    const ytdlpPath = getBinPath('yt-dlp.exe');
    const updateProc = spawn(ytdlpPath, ['-U']);
    updateProc.on('error', (err) => console.error('Failed to start yt-dlp update:', err));
    updateProc.stdout.on('data', (d) => console.log(`yt-dlp update: ${d}`));
    updateProc.stderr.on('data', (d) => console.error(`yt-dlp update err: ${d}`));
  } catch (err) {
    console.error('Failed to trigger yt-dlp auto-update:', err);
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const mainWindow = createWindow();
  if (!isDev) {
    mainWindow.webContents.once('did-finish-load', () => {
      autoUpdateYtdlp();
      void updates.check();
      setInterval(() => void updates.check(), 60 * 60 * 1000).unref();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const getBinPath = (filename) => {
  const base = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin')
    : path.join(__dirname, '../bin');
  return path.join(base, filename);
};

ipcMain.handle('execute_download', async (event, { id, url, settings }) => {
  const report = (status, progress_percent, speed = '', eta = '') => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('download-progress', { id, status, progress_percent, speed, eta });
    }
  };

  const configuredPath = settings.defaultDownloadPath;
  const directory = !configuredPath || configuredPath === './downloads' || configuredPath === 'downloads'
    ? path.join(os.homedir(), 'Downloads', 'Viddax')
    : configuredPath;
  if (updates.getState().phase === 'installing') throw new Error('Viddax is restarting to update.');
  activeDownloads += 1;
  try {
    const output = await downloadMedia({
      url, settings, binary: getBinPath('yt-dlp.exe'), directory, report,
    });
    report('Completed', 100);
    void shell.openPath(output);
  } finally {
    activeDownloads -= 1;
  }
});

// Custom window controls IPC
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('get-app-update-state', () => updates.getState());
ipcMain.handle('check-app-update', () => updates.check());
ipcMain.handle('install-app-update', () => updates.install());
ipcMain.handle('open-app-release-notes', () => {
  const { version, currentVersion } = updates.getState();
  const release = version || currentVersion;
  const releases = 'https://github.com/viddax/viddax/releases';
  return shell.openExternal(/^\d+\.\d+\.\d+$/.test(release) ? `${releases}/tag/v${release}` : releases);
});