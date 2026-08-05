/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { buildYtdlpArgs } = require('./command_builder');
const serve = require('electron-serve').default || require('electron-serve');

const loadURL = serve({ directory: path.join(__dirname, '../out') });

const isDev = process.env.NODE_ENV === 'development';

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
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

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

ipcMain.handle('execute_download', (event, { id, url, settings }) => {
  return new Promise((resolve, reject) => {
    try {
      const binDir = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'bin')
        : path.join(__dirname, '../bin');
      const ytdlpPath = getBinPath('yt-dlp.exe');
      
      const args = buildYtdlpArgs(url, settings);
      
      // Point yt-dlp to directory containing both ffmpeg and ffprobe
      args.push('--ffmpeg-location', binDir);
      
      // Spawn bundled yt-dlp natively
      const child = spawn(ytdlpPath, args);

      // Regex to match [download] 45.3% of ~50.00MiB at 2.00MiB/s ETA 00:25
      const re = /\[download\]\s+([0-9.]+)% .*?at\s+([0-9.a-zA-Z/]+)\s+ETA\s+([0-9:]+)/;

      child.stdout.on('data', (data) => {
        const line = data.toString();
        const match = line.match(re);

        if (match) {
          event.sender.send('download-progress', {
            id,
            status: 'Downloading...',
            progress_percent: parseFloat(match[1]),
            speed: match[2],
            eta: match[3],
          });
        } else if (line.includes('[ExtractAudio]') || line.includes('[Merger]') || line.includes('[ffmpeg]')) {
          event.sender.send('download-progress', {
            id,
            status: 'Processing (Merging/Audio)...',
            progress_percent: 100.0,
            speed: '',
            eta: '',
          });
        }
      });

      child.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr [${id}]: ${data}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          event.sender.send('download-progress', {
            id,
            status: 'Completed',
            progress_percent: 100.0,
            speed: '',
            eta: '',
          });
          resolve();
        } else {
          event.sender.send('download-progress', {
            id,
            status: 'Error',
            progress_percent: 0,
            speed: '',
            eta: '',
          });
          reject(`yt-dlp exited with code ${code}`);
        }
      });

      child.on('error', (err) => {
        reject(`Failed to start yt-dlp: ${err.message}`);
      });
    } catch (e) {
      reject(`Failed to setup download engine: ${e.message}`);
    }
  });
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
