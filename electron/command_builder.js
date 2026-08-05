/* eslint-disable @typescript-eslint/no-require-imports */
const { PLATFORMS, detectPlatform } = require('./router');

/**
 * Builds the array of arguments for yt-dlp based on the user settings and platform.
 * @param {string} url - The media URL
 * @param {object} settings - The ViddaxSettings object from the frontend
 * @returns {string[]} - Array of arguments for child_process.spawn
 */
function buildYtdlpArgs(url, settings) {
  let targetUrl = url;
  const platform = detectPlatform(url);
  const args = [];

  // Edge Case: Spotify cannot be directly downloaded by yt-dlp.
  // Prepend ytsearch1: to let yt-dlp automatically find the track on YouTube Music.
  if (platform === PLATFORMS.SPOTIFY) {
    if (!targetUrl.startsWith('ytsearch')) {
      // In a more complex app, we would query Spotify API for the track name.
      // But yt-dlp can sometimes extract metadata from Spotify URLs and fallback automatically, 
      // or we can force it to search YouTube using the URL.
      // For now, we pass the URL directly, as modern yt-dlp versions have a Spotify extractor that falls back to YT.
    }
  }

  args.push(targetUrl);

  // 1. Download Mode: Audio-only vs Video
  if (settings.downloadMode === 'audio') {
    // Audio-only extraction
    args.push('-x'); // extract audio
    const audioFmt = settings.audioFormat && settings.audioFormat !== 'best' ? settings.audioFormat : 'mp3';
    args.push('--audio-format', audioFmt);
    if (settings.audioBitrate) {
      const bitrate = settings.audioBitrate.replace('kbps', '');
      args.push('--audio-quality', `${bitrate}K`);
    }
  } else {
    // Video mode — Quality & Format Merging
    let formatString = 'bestvideo+bestaudio/best';
    
    if (platform === PLATFORMS.REDDIT || platform === PLATFORMS.TWITCH) {
      formatString = 'bestvideo+bestaudio/best';
      args.push('--merge-output-format', 'mp4');
    } else {
      switch (settings.videoQuality) {
        case '8k+': formatString = 'bestvideo[height<=4320]+bestaudio/best'; break;
        case '4k': formatString = 'bestvideo[height<=2160]+bestaudio/best'; break;
        case '1080p': formatString = 'bestvideo[height<=1080]+bestaudio/best'; break;
        case '720p': formatString = 'bestvideo[height<=720]+bestaudio/best'; break;
      }
    }
    
    args.push('-f', formatString);

    if (settings.youtubeContainer && settings.youtubeContainer !== 'auto') {
      args.push('--merge-output-format', settings.youtubeContainer);
    }
  }

  // 2. JavaScript Runtime (required for YouTube anti-bot challenges)
  // Node.js is always available since we're running inside Electron
  args.push('--js-runtimes', 'node');

  // 3. Power User Features — Cookies
  // YouTube now requires authentication to bypass bot detection.
  // Default to chrome cookies unless the user explicitly disabled it.
  if (settings.useCookies !== false) {
    const browser = settings.browserIdentity || 'chrome';
    args.push('--cookies-from-browser', browser);
  }

  if (settings.sponsorBlockIntegration && platform === PLATFORMS.YOUTUBE) {
    args.push('--sponsorblock-remove', 'sponsor');
  }

  // 3. Platform Specifics
  if (platform === PLATFORMS.TIKTOK || platform === PLATFORMS.INSTAGRAM) {
    // Inject bypass extractor args for unwatermarked/high-res media
    if (platform === PLATFORMS.TIKTOK) {
      args.push('--extractor-args', 'tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com');
    }
  }

  // 4. Output Pathing
  let basePath = settings.defaultDownloadPath || './downloads';
  let template = '%(title)s (%(upload_date)s).%(ext)s'; // 'pretty' default
  if (settings.filenameStyle === 'nerdy') template = '%(id)s_%(resolution)s_%(vcodec)s.%(ext)s';
  else if (settings.filenameStyle === 'basic') template = '%(title)s.%(ext)s';
  else if (settings.filenameStyle === 'classic') template = '%(title)s_%(upload_date)s.%(ext)s';
  
  let finalOutput = settings.autoCreateSubdirectories 
    ? (settings.folderStructure === 'by author' ? `${basePath}/%(extractor)s/%(uploader)s/${template}` : `${basePath}/%(extractor)s/${template}`)
    : `${basePath}/${template}`;
  
  args.push('-o', finalOutput);

  // 5. Audio & Subtitles
  if (settings.embedSubtitles) args.push('--embed-subs');
  if (settings.embedThumbnail) args.push('--embed-thumbnail');
  if (settings.splitByChapters) args.push('--split-chapters');
  if (!settings.disableFileMetadata) args.push('--add-metadata');

  // 6. Network
  if (settings.proxyString) args.push('--proxy', settings.proxyString);
  if (settings.rateLimit && settings.rateLimit !== 'unlimited') args.push('--limit-rate', settings.rateLimit.replace('mb/s', 'M'));
  if (settings.alwaysTunnelFiles) args.push('--force-ipv4');

  return args;
}

module.exports = {
  buildYtdlpArgs
};
