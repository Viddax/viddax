/* eslint-disable @typescript-eslint/no-require-imports */
const { execFile, spawn } = require('node:child_process');
const { mkdir, realpath, stat } = require('node:fs/promises');
const { createInterface } = require('node:readline');
const path = require('node:path');
const { buildYtdlpArgs } = require('./command_builder');

const progressPrefix = 'VIDDAX_PROGRESS:';
const filePrefix = 'VIDDAX_FILE:';
const thumbsPrefix = 'VIDDAX_THUMBS:';
const responseDecodingError = /while decompressing|incorrect header check|invalid content encoding|unrecognized content encoding/i;

function runYtdlp(binary, args, report, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const cancel = () => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform === 'win32') {
        const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
        execFile(taskkill, ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }, (error) => {
          if (error && child.exitCode === null && child.signalCode === null) child.kill();
        });
      } else {
        child.kill();
      }
    };
    signal.addEventListener('abort', cancel, { once: true });

    const stdout = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const stderr = createInterface({ input: child.stderr, crlfDelay: Infinity });
    const files = new Set();
    let error = '';
    let fallbackError = '';
    let cookieError = false;
    let lastStage = '';
    let percent = 0;

    const stage = (status) => {
      if (status === lastStage) return;
      lastStage = status;
      report(status, percent);
    };

    stdout.on('line', (line) => {
      if (signal.aborted) return;
      if (line.startsWith(filePrefix) || line.startsWith(thumbsPrefix)) {
        try {
          const isThumbnail = line.startsWith(thumbsPrefix);
          const value = JSON.parse(line.slice((isThumbnail ? thumbsPrefix : filePrefix).length));
          if (isThumbnail && Array.isArray(value)) {
            for (const item of value) {
              if (typeof item?.filepath === 'string') {
                const { dir, name } = path.parse(item.filepath);
                files.add(path.join(dir, name + '.jpg'));
              }
            }
          } else if (!isThumbnail && typeof value === 'string') {
            files.add(value);
          }
        } catch {
          // yt-dlp prints NA for metadata unavailable on some entries.
        }
      } else if (line.startsWith(progressPrefix)) {
        const [value, speed = '', eta = ''] = line.slice(progressPrefix.length).split('|').map(field => field.trim());
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) percent = Math.min(99, Math.max(0, parsed));
        lastStage = 'Downloading…';
        report(lastStage, percent, speed === 'NA' ? '' : speed, eta === 'NA' ? '' : eta);
      } else if (/^\[(?:ThumbnailsConvertor|info\] Writing .*thumbnail)/i.test(line)) {
        stage('Saving thumbnail…');
      } else if (/^\[(?:ExtractAudio|Merger|Fixup\w+|Metadata|Embed\w+|ModifyChapters|SplitChapters)\]/.test(line)) {
        stage('Converting or processing media…');
      }
    });

    stderr.on('line', (line) => {
      if (!line.trim()) return;
      if (line.startsWith('ERROR:')) {
        error = line.slice(6).trim();
        cookieError ||= /cookies?|DPAPI/i.test(error);
      } else {
        fallbackError = line;
      }
    });

    child.once('error', reject);
    child.once('close', (code) => {
      signal.removeEventListener('abort', cancel);
      if (signal.aborted) reject(signal.reason);
      else resolve({ code, error: error || fallbackError, cookieError, files });
    });
  });
}

async function savedFile(output, candidate) {
  try {
    const file = await realpath(path.resolve(output, candidate));
    const relative = path.relative(output, file);
    if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) return null;
    if (!(await stat(file)).isFile()) return null;
    return { path: file, name: path.basename(file), format: path.extname(file).slice(1).toUpperCase() };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function downloadError(detail) {
  if (responseDecodingError.test(detail)) return 'The site returned a response Viddax couldn’t decode. Try opening the link in your browser and copying the full video URL.';
  if (/unsupported url/i.test(detail)) return 'Viddax couldn’t download from this link. Try a direct link to the media.';
  if (/private|sign in|login|log in|members.only|age.restricted/i.test(detail)) return 'This link requires an account or access permission. Check that you can open it in your browser.';
  if (/requested format is not available/i.test(detail)) return 'The requested format is unavailable. Try a different quality or download mode.';
  if (/403|429|timed out|connection|http error/i.test(detail)) return 'The site didn’t complete the request. Check the link and your connection, then retry.';
  return 'Viddax couldn’t save this media. Check the link and output folder, then retry.';
}

async function downloadMedia({ url, settings, binary, directory, report, signal = new AbortController().signal }) {
  let target;
  try { target = new URL(url); } catch { throw new Error('Enter a valid HTTP or HTTPS media link.'); }
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Enter a valid HTTP or HTTPS media link.');

  const started = performance.now();
  let firstProgressMs = null;
  const reportProgress = (status, ...values) => {
    if (firstProgressMs === null && ['Downloading…', 'Saving thumbnail…'].includes(status)) {
      firstProgressMs = Math.round(performance.now() - started);
    }
    report(status, ...values);
  };

  let output;
  try {
    await mkdir(directory, { recursive: true });
    output = await realpath(directory);
  } catch {
    throw new Error('Viddax couldn’t access the download folder. Choose a writable folder in Settings.');
  }
  const args = ['--ignore-config', '--ffmpeg-location', path.dirname(binary),
    ...buildYtdlpArgs(target.href, { ...settings, defaultDownloadPath: output })];

  let result = await runYtdlp(binary, args, reportProgress, signal);
  let requestedIdentity = false;
  while (result.code !== 0 && result.files.size === 0) {
    const cookiesIndex = args.indexOf('--cookies-from-browser');
    if (result.cookieError && cookiesIndex !== -1) {
      args.splice(cookiesIndex, 2);
      report('Browser cookies unavailable. Retrying directly…', 0);
    } else if (!requestedIdentity && responseDecodingError.test(result.error)) {
      requestedIdentity = true;
      args.unshift('--add-headers', 'Accept-Encoding:identity');
      report('Retrying with an uncompressed response…', 0);
    } else {
      break;
    }
    result = await runYtdlp(binary, args, reportProgress, signal);
  }

  signal.throwIfAborted();
  const files = [];
  for (const candidate of result.files) {
    const file = await savedFile(output, candidate);
    if (file) files.push(file);
  }
  if (files.length === 0 && result.code !== 0) throw new Error(downloadError(result.error));
  if (files.length === 0) throw new Error(settings.downloadMode === 'image'
    ? 'This link has no downloadable thumbnail.' : 'No completed media files were found for this link.');
  return {
    directory: output, files, warning: result.code !== 0 ? downloadError(result.error) : '',
    firstProgressMs, fileSavedMs: Math.round(performance.now() - started),
  };
}

module.exports = { downloadMedia, savedFile };
