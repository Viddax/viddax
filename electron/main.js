/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { appendFile } = require('node:fs/promises');
const { autoUpdater } = require('electron-updater');
const { downloadMedia, savedFile } = require('./download_engine');
const { createUpdateController } = require('./app_updates');
const serve = require('electron-serve').default || require('electron-serve');
const os = require('os');

const loadURL = serve({ directory: path.join(__dirname, '../out') });

const isDev = process.env.NODE_ENV === 'development';
const downloads = new Map();
const completedDownloads = new WeakMap();
const defaultDirectory = path.join(os.homedir(), 'Downloads', 'Viddax');
const measuredWindows = new WeakSet();
const mediaExtensions = new Set(['.mp4', '.m4a', '.mkv', '.webm', '.mov', '.avi', '.flv', '.ts',
  '.mp3', '.aac', '.ogg', '.opus', '.wav', '.flac', '.m4b', '.aiff', '.mka', '.weba',
  '.jpg', '.jpeg', '.png', '.webp', '.gif']);

function recordTiming(name, milliseconds) {
  const log = process.env.VIDDAX_PERF_LOG;
  if (log && milliseconds !== null) {
    void appendFile(log, JSON.stringify({ name, milliseconds, version: app.getVersion() }) + '\n')
      .catch((error) => console.error('Could not write performance log:', error.message));
  }
}
const updates = createUpdateController({
  updater: autoUpdater,
  currentVersion: app.getVersion(),
  enabled: app.isPackaged && process.platform === 'win32',
  canRestart: () => downloads.size === 0,
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

ipcMain.handle('download-context', (event) => {
  if (!measuredWindows.has(event.sender)) {
    measuredWindows.add(event.sender);
    recordTiming('launch_to_ready', Math.round(process.uptime() * 1000));
  }
  return defaultDirectory;
});

ipcMain.handle('execute_download', async (event, { id, url, settings }) => {
  const sender = event.sender;
  if (typeof id !== 'string' || typeof url !== 'string' || !settings || typeof settings !== 'object') {
    return { status: 'failed', message: 'Enter a valid media link and try again.' };
  }
  if (downloads.has(sender)) return { status: 'failed', message: 'A download is already in progress.' };
  if (updates.getState().phase === 'installing') return { status: 'failed', message: 'Viddax is restarting to update.' };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  downloads.set(sender, { id, controller });
  sender.once('destroyed', cancel);
  completedDownloads.delete(sender);

  const report = (status, progress_percent, speed = '', eta = '') => {
    if (!sender.isDestroyed() && !controller.signal.aborted) {
      sender.send('download-progress', { id, status, progress_percent, speed, eta });
    }
  };

  const configuredPath = settings.defaultDownloadPath;
  const directory = !configuredPath || configuredPath === './downloads' || configuredPath === 'downloads'
    ? defaultDirectory
    : configuredPath;
  try {
    const result = await downloadMedia({
      url, settings, binary: getBinPath('yt-dlp.exe'), directory, report, signal: controller.signal,
    });
    controller.signal.throwIfAborted();
    completedDownloads.set(sender, { id, ...result });
    recordTiming('download_to_first_progress', result.firstProgressMs);
    recordTiming('download_to_file_saved', result.fileSavedMs);
    return { status: 'completed', directory: result.directory, warning: result.warning,
      files: result.files.map(({ name, format }) => ({ name, format })) };
  } catch (error) {
    return controller.signal.aborted ? { status: 'cancelled' } : { status: 'failed', message: error.message };
  } finally {
    downloads.delete(sender);
    sender.removeListener('destroyed', cancel);
  }
});

ipcMain.handle('cancel-download', (event, id) => {
  const job = downloads.get(event.sender);
  if (job?.id === id) job.controller.abort();
});

ipcMain.handle('show-downloaded-file', async (event, { id, index, reveal }) => {
  const result = completedDownloads.get(event.sender);
  const recorded = result && result.id === id && Number.isInteger(index) ? result.files[index] : null;
  const file = recorded && await savedFile(result.directory, recorded.path);
  if (!file || file.path !== recorded.path) return 'This file was moved or deleted.';
  if (reveal) {
    shell.showItemInFolder(file.path);
    return '';
  }
  if (!mediaExtensions.has(path.extname(file.path).toLowerCase())) return 'Use Show in folder to open this file.';
  return await shell.openPath(file.path) ? 'Windows couldn’t open this file. Try opening it from its folder.' : '';
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
