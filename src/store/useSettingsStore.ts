import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  themeMode: 'auto' | 'light' | 'dark';
  autoLanguageSelection: boolean;
  preferredLanguage: string;
  
  reduceMotion: boolean;
  reduceTransparency: boolean;
  
  dontOpenQueueAuto: boolean;
  
  videoQuality: '8k+' | '4k' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';
  preferredYoutubeCodec: 'h264 + aac' | 'av1 + opus' | 'vp9 + opus';
  youtubeContainer: 'auto' | 'mp4' | 'webm' | 'mkv';
  allowH265: boolean;
  twitterConvertLoopingToGif: boolean;
  
  audioFormat: 'best' | 'mp3' | 'ogg' | 'wav' | 'opus';
  audioBitrate: '320kbps' | '256kbps' | '128kbps' | '96kbps' | '64kbps' | '8kbps';
  youtubeAudioQualityPreferBetter: boolean;
  youtubePreferredDubLanguage: string;
  tiktokDownloadOriginalSound: boolean;
  
  filenameStyle: 'classic' | 'basic' | 'pretty' | 'nerdy';
  savingMethod: 'ask' | 'download' | 'share' | 'copy';
  preferredSubtitleLanguage: string;
  disableFileMetadata: boolean;
  
  localMediaProcessing: 'disabled' | 'preferred' | 'forced';
  
  useCustomServer: boolean;
  customServerKeyEnabled: boolean;
  customServerKey: string;
  alwaysTunnelFiles: boolean;
  disableAnalytics: boolean;
  
  enableNerdFeatures: boolean;

  // New Advanced Settings
  defaultDownloadPath: string;
  autoCreateSubdirectories: boolean;
  folderStructure: 'flat' | 'by author';
  
  maxConcurrentDownloads: '1' | '3' | '5' | '10';
  rateLimit: 'unlimited' | '5mb/s' | '1mb/s';
  retryOnFailure: '0' | '3' | '5' | 'infinite';
  proxyString: string;
  
  embedSubtitles: boolean;
  autoTranslateSubtitles: boolean;
  
  sponsorBlockIntegration: boolean;
  embedThumbnail: boolean;
  splitByChapters: boolean;
  
  useCookies: boolean;
  browserIdentity: 'chrome' | 'firefox' | 'safari' | 'edge';

  setSetting: <K extends keyof Omit<SettingsState, 'setSetting' | 'reset'>>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
}

const initialState: Omit<SettingsState, 'setSetting' | 'reset'> = {
  themeMode: 'auto',
  autoLanguageSelection: true,
  preferredLanguage: 'english',
  
  reduceMotion: false,
  reduceTransparency: false,
  
  dontOpenQueueAuto: false,
  
  videoQuality: '1080p',
  preferredYoutubeCodec: 'h264 + aac',
  youtubeContainer: 'auto',
  allowH265: false,
  twitterConvertLoopingToGif: false,
  
  audioFormat: 'best',
  audioBitrate: '320kbps',
  youtubeAudioQualityPreferBetter: false,
  youtubePreferredDubLanguage: 'original',
  tiktokDownloadOriginalSound: false,
  
  filenameStyle: 'pretty',
  savingMethod: 'download',
  preferredSubtitleLanguage: 'none',
  disableFileMetadata: false,
  
  localMediaProcessing: 'disabled',
  
  useCustomServer: false,
  customServerKeyEnabled: false,
  customServerKey: '',
  alwaysTunnelFiles: false,
  disableAnalytics: false,
  
  enableNerdFeatures: false,

  // New Advanced Settings Defaults
  defaultDownloadPath: '',
  autoCreateSubdirectories: false,
  folderStructure: 'by author',
  
  maxConcurrentDownloads: '3',
  rateLimit: 'unlimited',
  retryOnFailure: '3',
  proxyString: '',
  
  embedSubtitles: false,
  autoTranslateSubtitles: false,
  
  sponsorBlockIntegration: false,
  embedThumbnail: true,
  splitByChapters: false,
  
  useCookies: true,
  browserIdentity: 'chrome',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,
      setSetting: (key, value) => set((state) => ({ ...state, [key]: value })),
      reset: () => set(initialState),
    }),
    {
      name: 'viddax-settings',
    }
  )
);
