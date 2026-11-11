/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const { createInterface } = require('node:readline');
const path = require('node:path');
const { buildYtdlpArgs } = require('./command_builder');

const progressPrefix = 'VIDDAX_PROGRESS:';

function runYtdlp(binary, args, report) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const stderr = createInterface({ input: child.stderr, crlfDelay: Infinity });
    let error = '';
    let fallbackError = '';
    let thumbnailFound = false;
    let cookieError = false;
    let lastStage = '';
    let percent = 0;

    const stage = (status) => {
      if (status === lastStage) return;
      lastStage = status;
      report(status, percent);
    };

    stdout.on('line', (line) => {
      if (line.startsWith(progressPrefix)) {
        const [value, speed, eta] = line.slice(progressPrefix.length).split('|').map(field => field.trim());
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) percent = Math.min(99, Math.max(0, parsed));
        lastStage = 'Downloading…';
        report(lastStage, percent, speed === 'NA' ? '' : speed, eta === 'NA' ? '' : eta);
      } else if (/^\[info\] (?:Writing .*thumbnail|.*thumbnail.*already present)/i.test(line)) {
        thumbnailFound = true;
        stage('Saving thumbnail…');
      } else if (/^\[ThumbnailsConvertor\]/.test(line)) {
        stage('Saving thumbnail…');
      } else if (/^\[(?:ExtractAudio|Merger|Fixup\w+|Metadata|Embed\w+|ModifyChapters|SplitChapters)\]/.test(line)) {
        stage('Processing media…');
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
    child.once('close', (code, signal) => {
      resolve({ code, signal, error: error || fallbackError, cookieError, thumbnailFound });
    });
  });
}

async function downloadMedia({ url, settings, binary, directory, report }) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new Error('Enter an HTTP or HTTPS media link.');
  }
  const output = path.resolve(directory);
  await mkdir(output, { recursive: true });
  const args = [
    '--ffmpeg-location', path.dirname(binary),
    ...buildYtdlpArgs(target.href, { ...settings, defaultDownloadPath: output }),
  ];

  let result = await runYtdlp(binary, args, report);
  if (result.code !== 0 && settings.useCookies && result.cookieError) {
    report('Browser cookies unavailable. Retrying directly…', 0);
    const retryArgs = args.slice();
    retryArgs.splice(retryArgs.indexOf('--cookies-from-browser'), 2);
    result = await runYtdlp(binary, retryArgs, report);
  }
  if (result.code !== 0) {
    throw new Error(result.error || `Download stopped (${result.signal || result.code}).`);
  }
  if (settings.downloadMode === 'image' && !result.thumbnailFound) {
    throw new Error('This link has no downloadable thumbnail.');
  }
  return output;
}

module.exports = { downloadMedia };
