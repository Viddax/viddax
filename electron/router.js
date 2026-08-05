// Platform Router for Viddax
// Classifies the input URL to determine domain-specific extraction rules

const PLATFORMS = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  INSTAGRAM: 'Instagram',
  REDDIT: 'Reddit',
  FACEBOOK: 'Facebook',
  TWITCH: 'Twitch',
  VK: 'VK',
  STREAMABLE: 'Streamable',
  PINTEREST: 'Pinterest',
  SOUNDCLOUD: 'SoundCloud',
  SPOTIFY: 'Spotify',
  TUMBLR: 'Tumblr',
  KICK: 'Kick',
  GENERIC: 'Generic'
};

/**
 * Detects the target platform from a given URL using regex.
 * @param {string} url - The media URL
 * @returns {string} - The SupportedPlatform enum string
 */
function detectPlatform(url) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) return PLATFORMS.YOUTUBE;
    if (host.includes('tiktok.com')) return PLATFORMS.TIKTOK;
    if (host.includes('instagram.com')) return PLATFORMS.INSTAGRAM;
    if (host.includes('reddit.com') || host.includes('redd.it')) return PLATFORMS.REDDIT;
    if (host.includes('facebook.com') || host.includes('fb.watch')) return PLATFORMS.FACEBOOK;
    if (host.includes('twitch.tv')) return PLATFORMS.TWITCH;
    if (host.includes('vk.com') || host.includes('vkvideo.ru')) return PLATFORMS.VK;
    if (host.includes('streamable.com')) return PLATFORMS.STREAMABLE;
    if (host.includes('pinterest.com') || host.includes('pin.it')) return PLATFORMS.PINTEREST;
    if (host.includes('soundcloud.com')) return PLATFORMS.SOUNDCLOUD;
    if (host.includes('spotify.com')) return PLATFORMS.SPOTIFY;
    if (host.includes('tumblr.com')) return PLATFORMS.TUMBLR;
    if (host.includes('kick.com')) return PLATFORMS.KICK;

    return PLATFORMS.GENERIC;
  } catch (err) {
    // If URL parsing fails, default to generic and let yt-dlp attempt resolution
    return PLATFORMS.GENERIC;
  }
}

module.exports = {
  PLATFORMS,
  detectPlatform
};
