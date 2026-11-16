"use client";

import { lazy, Suspense, useState, useEffect } from "react";
import { Settings, Video, Music, Globe, Image as ImageIcon, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LandingPage } from "@/components/LandingPage/LandingPage";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDownloadProgress, type DownloadMode } from "@/hooks/useDownloadProgress";
import styles from "./page.module.scss";

const SettingsPanel = lazy(() =>
  import("@/components/Settings/SettingsPanel").then(({ SettingsPanel }) => ({ default: SettingsPanel }))
);

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fullPlaylist, setFullPlaylist] = useState(false);
  const [downloadMode, setDownloadMode] = useState<DownloadMode>('video');
  const store = useSettingsStore();
  const { defaultDirectory, progress, result, busy, cancelling, actionError, download, cancel, showFile, clearFeedback } = useDownloadProgress();

  const customDirectory = store.defaultDownloadPath;
  const destination = !customDirectory || ['downloads', './downloads'].includes(customDirectory)
    ? defaultDirectory
    : customDirectory;
  const format = downloadMode === 'image' ? 'JPG'
    : downloadMode === 'audio' ? (store.audioFormat === 'best' ? 'Best available audio' : store.audioFormat.toUpperCase())
    : `${store.videoQuality} · ${store.youtubeContainer === 'auto' ? 'Automatic container' : store.youtubeContainer.toUpperCase()}`;

  const handleFetch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || busy) return;
    const { setSetting, reset, ...settings } = store;
    void setSetting;
    void reset;
    const outcome = await download(url.trim(), { ...settings, downloadMode, fullPlaylist });
    if (outcome?.status === 'completed' && !outcome.warning) {
      setUrl('');
      setFullPlaylist(false);
    }
  };

  const getDetectedPlatform = (input: string) => {
    if (!input) return null;
    const l = input.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) return 'YouTube';
    if (l.includes('tiktok.com')) return 'TikTok';
    if (l.includes('instagram.com')) return 'Instagram';
    if (l.includes('reddit.com')) return 'Reddit';
    if (l.includes('twitter.com') || l.includes('x.com')) return 'X / Twitter';
    if (l.includes('facebook.com') || l.includes('fb.watch') || l.includes('fb.gg')) return 'Facebook';
    if (l.includes('twitch.tv')) return 'Twitch';
    if (l.includes('soundcloud.com')) return 'SoundCloud';
    if (l.includes('spotify.com')) return 'Spotify';
    if (l.includes('pinterest.com')) return 'Pinterest';
    if (l.includes('vk.com')) return 'VK';
    if (l.includes('tumblr.com')) return 'Tumblr';
    if (l.includes('kick.com')) return 'Kick';
    if (l.includes('streamable.com')) return 'Streamable';
    if (l.includes('snapchat.com')) return 'Snapchat';
    if (l.includes('vimeo.com')) return 'Vimeo';
    if (l.includes('dailymotion.com') || l.includes('dai.ly')) return 'Dailymotion';
    if (l.includes('bilibili.com') || l.includes('bilibili.tv')) return 'Bilibili';
    if (l.includes('mixcloud.com')) return 'Mixcloud';
    if (l.includes('apple.com') && (l.includes('/music') || l.includes('/podcast'))) return 'Apple Music/Podcasts';
    if (l.includes('patreon.com')) return 'Patreon';
    return null;
  };

  const detectedPlatform = getDetectedPlatform(url);

  const getAvailableModes = (platform: string | null): DownloadMode[] => {
    switch (platform) {
      case 'Spotify':
      case 'SoundCloud':
      case 'Mixcloud':
      case 'Apple Music/Podcasts':
        return ['audio'];
      case 'Instagram':
      case 'Reddit':
      case 'Pinterest':
      case 'X / Twitter':
      case 'Tumblr':
      case 'Snapchat':
      case 'Patreon':
        return ['video', 'image', 'audio'];
      case 'YouTube':
      case 'TikTok':
      case 'Bilibili':
        return ['video', 'audio', 'image'];
      case 'Facebook':
      case 'Twitch':
      case 'VK':
      case 'Streamable':
      case 'Kick':
      case 'Vimeo':
      case 'Dailymotion':
        return ['video', 'audio'];
      default:
        return ['video', 'audio', 'image'];
    }
  };

  const availableModes = getAvailableModes(detectedPlatform);

  useEffect(() => {
    if (!availableModes.includes(downloadMode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDownloadMode(availableModes[0]);
    }
  }, [availableModes, downloadMode]);

  const appUI = (
    <main className={styles.container}>
      <div className={styles.topRightActions}>
        <div className={styles.platformsWrapper}>
          <button 
            className={`${styles.iconButton} ${isPlatformsOpen ? styles.active : ''}`}
            onClick={() => setIsPlatformsOpen(!isPlatformsOpen)}
            aria-label="Supported Platforms"
            type="button"
          >
            <Globe size={20} strokeWidth={1.5} />
          </button>
          
          <AnimatePresence>
            {isPlatformsOpen && (
              <motion.div 
                className={styles.platformsList}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <ul>
                  <li>YouTube</li>
                  <li>TikTok</li>
                  <li>Instagram</li>
                  <li>Reddit</li>
                  <li>X / Twitter</li>
                  <li>Facebook</li>
                  <li>Twitch</li>
                  <li>VK</li>
                  <li>Streamable</li>
                  <li>Pinterest</li>
                  <li>SoundCloud</li>
                  <li>Spotify</li>
                  <li>Tumblr</li>
                  <li>Kick</li>
                  <li>Snapchat</li>
                  <li>Vimeo</li>
                  <li>Dailymotion</li>
                  <li>Bilibili</li>
                  <li>Mixcloud</li>
                  <li>Apple Music/Podcasts</li>
                  <li>Patreon</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          className={styles.iconButton} 
          onClick={() => {
            const current = store.themeMode;
            if (current === 'dark') store.setSetting('themeMode', 'light');
            else if (current === 'light') store.setSetting('themeMode', 'auto');
            else store.setSetting('themeMode', 'dark');
          }}
          aria-label="Toggle Theme"
          type="button"
        >
          {store.themeMode === 'dark' ? <Sun size={20} strokeWidth={1.5} /> : store.themeMode === 'light' ? <Moon size={20} strokeWidth={1.5} /> : <span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>AUTO</span>}
        </button>

        <button 
          className={styles.iconButton} 
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open Settings"
        >
          <Settings size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1>viddax.</h1>
        </div>

        <div className={styles.modeToggle}>
          {availableModes.map((mode) => (
            <button
              key={mode}
              className={`${styles.modeButton} ${downloadMode === mode ? styles.active : ''}`}
              onClick={() => setDownloadMode(mode)}
              type="button"
              disabled={busy}
            >
              {downloadMode === mode && (
                <motion.div
                  layoutId="activePill"
                  className={styles.activePill}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={styles.modeContent}>
                {mode === 'video' && <Video size={14} strokeWidth={2} />}
                {mode === 'audio' && <Music size={14} strokeWidth={2} />}
                {mode === 'image' && <ImageIcon size={14} strokeWidth={2} />}
                {mode === 'image' ? 'Thumbnail' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.inputWrapper}>
          <form className={styles.inputGroup} onSubmit={handleFetch}>
            <input 
              type="url" 
              placeholder="Paste media URL here..." 
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setFullPlaylist(false);
                if (result?.status !== 'completed') clearFeedback();
              }}
              disabled={busy}
              required
            />
            <button 
              type="submit" 
              className={styles.fetchButton}
              disabled={busy || !url.trim()}
            >
              {result && result.status !== 'completed' ? 'Retry' : 'Fetch'}
            </button>
          </form>

          <AnimatePresence>
            {detectedPlatform && !busy && !result && (
              <motion.div
                className={styles.platformDetector}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className={`${styles.glowingDot}`} />
                <span><strong>{detectedPlatform}</strong> link detected</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.downloadOptions}>
          <div className={styles.downloadDestination}>
            <strong>{format}</strong>
            {destination && <span title={destination}>{destination}</span>}
          </div>
          <label className={styles.playlistOption}>
            <input type="checkbox" checked={fullPlaylist} disabled={busy}
              onChange={(event) => setFullPlaylist(event.target.checked)} />
            Full playlist
          </label>
        </div>

        {(busy || result) && (
          <section className={styles.downloadCard} aria-label="Download status">
            {busy && (
              <>
                <div className={styles.downloadStatus}>
                  <span role="status">{cancelling ? 'Cancelling…' : progress?.status}</span>
                  <button type="button" disabled={cancelling} onClick={() => void cancel()}>Cancel</button>
                </div>
                <progress max={100} value={progress?.progress_percent || undefined} aria-label="Download progress" />
                {(progress?.speed || progress?.eta) && (
                  <div className={styles.downloadDetails}>
                    {progress.speed && <span>{progress.speed}</span>}
                    {progress.eta && <span>ETA {progress.eta}</span>}
                  </div>
                )}
              </>
            )}
            {result?.status === 'completed' && (
              <>
                <strong role="status">{result.files.length === 1 ? 'File saved' : `${result.files.length} files saved`}</strong>
                <span className={styles.savedDirectory}>{result.directory}</span>
                {result.warning && <p role="alert">{result.warning}</p>}
                <ul className={styles.savedFiles}>
                  {result.files.map((file, index) => (
                    <li key={index}>
                      <span title={file.name}>{file.name}{file.format && <small> · {file.format}</small>}</span>
                      <div className={styles.downloadFileActions}>
                        <button type="button" onClick={() => void showFile(index, false)}>Open file</button>
                        <button type="button" onClick={() => void showFile(index, true)}>Show in folder</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result?.status === 'failed' && <p role="alert">{result.message}</p>}
            {result?.status === 'cancelled' && <p role="status">Download cancelled.</p>}
            {actionError && <p role="alert">{actionError}</p>}
          </section>
        )}
      </div>
    </main>
  );

  return (
    <>
      {process.env.NEXT_PUBLIC_VIDDAX_DESKTOP !== 'true' && (
        <div className="web-only" style={{ height: '100vh', width: '100vw', overflow: 'auto' }}>
          <LandingPage />
        </div>
      )}
      <div className="electron-only" style={{ height: '100%', width: '100%' }}>
        <Suspense fallback={appUI}>
          {isSettingsOpen ? <SettingsPanel onClose={() => setIsSettingsOpen(false)} /> : appUI}
        </Suspense>
      </div>
    </>
  );
}
