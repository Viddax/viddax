/* eslint-disable @typescript-eslint/no-require-imports */
const { PLATFORMS, detectPlatform } = require('./router');

const videoHeights = {
  '8k+': 4320, '4k': 2160, '1440p': 1440, '1080p': 1080, '720p': 720,
  '480p': 480, '360p': 360, '240p': 240, '144p': 144,
};

function buildYtdlpArgs(url, settings) {
  const platform = detectPlatform(url);
  const rateLimited = settings.rateLimit && settings.rateLimit !== 'unlimited';
  const imageMode = settings.downloadMode === 'image';
  const args = [
    '--newline', '--no-colors', '--progress-delta', '0.25',
    '--progress-template', 'download:VIDDAX_PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '--js-runtimes', `node:${process.execPath}`,
  ];

  if (imageMode) {
    args.push('--write-thumbnail', '--skip-download', '--convert-thumbnails', 'jpg');
  } else {
    args.push('--concurrent-fragments', rateLimited ? '1' : '4');
    if (settings.downloadMode === 'audio') {
      const format = settings.audioFormat === 'ogg' ? 'vorbis' : settings.audioFormat || 'best';
      args.push('-f', 'bestaudio/best', '-x', '--audio-format', format);
      if (format !== 'best' && settings.audioBitrate) {
        args.push('--audio-quality', settings.audioBitrate.replace('kbps', 'K'));
      }
    } else {
      const maxHeight = videoHeights[settings.videoQuality];
      const height = maxHeight ? `[height<=?${maxHeight}]` : '';
      args.push('-f', `bestvideo${height}+bestaudio/best${height}`);
      if (settings.youtubeContainer && settings.youtubeContainer !== 'auto') {
        args.push('--merge-output-format', settings.youtubeContainer);
      } else if (platform === PLATFORMS.REDDIT || platform === PLATFORMS.TWITCH) {
        args.push('--merge-output-format', 'mp4');
      }
      if (settings.embedSubtitles) args.push('--embed-subs');
    }

    if (settings.sponsorBlockIntegration && platform === PLATFORMS.YOUTUBE) {
      args.push('--sponsorblock-remove', 'sponsor');
    }
    if (settings.embedThumbnail) args.push('--embed-thumbnail');
    if (settings.splitByChapters) args.push('--split-chapters');
    if (!settings.disableFileMetadata) args.push('--add-metadata');
  }

  if (settings.useCookies === true) {
    args.push('--cookies-from-browser', settings.browserIdentity || 'chrome');
  }
  if (settings.proxyString) args.push('--proxy', settings.proxyString);
  if (rateLimited) args.push('--limit-rate', settings.rateLimit.replace('mb/s', 'M'));
  if (settings.alwaysTunnelFiles) args.push('--force-ipv4');
  if (['0', '3', '5', 'infinite'].includes(settings.retryOnFailure)) {
    args.push('--retries', settings.retryOnFailure, '--fragment-retries', settings.retryOnFailure);
  }

  const templates = {
    nerdy: '%(id)s_%(resolution)s_%(vcodec)s.%(ext)s',
    basic: '%(title)s.%(ext)s',
    classic: '%(title)s_%(upload_date)s.%(ext)s',
    pretty: '%(title)s (%(upload_date)s).%(ext)s',
  };
  const folder = settings.autoCreateSubdirectories
    ? (settings.folderStructure === 'by author' ? '%(extractor)s/%(uploader)s/' : '%(extractor)s/')
    : '';
  args.push('-P', settings.defaultDownloadPath || './downloads');
  args.push('-o', folder + (templates[settings.filenameStyle] || templates.pretty));
  return [...args, '--', url];
}

module.exports = { buildYtdlpArgs };
