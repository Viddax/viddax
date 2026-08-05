"use client";

import { useState, useEffect } from "react";
import { Settings, Video, Music, Globe, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useDownloadProgress } from "@/hooks/useDownloadProgress";
import styles from "./page.module.scss";

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlatformsOpen, setIsPlatformsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'video' | 'audio' | 'image'>('video');
  const store = useSettingsStore();
  const { progress, status, speed, eta, setProgress, setStatus } = useDownloadProgress();

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsFetching(true);
    setProgress(0);
    setStatus("Starting download engine...");
    
    try {
      if (typeof window !== 'undefined' && 'electron' in window) {
        // Strip functions from store to prevent IPC cloning errors
        const settingsPayload = JSON.parse(JSON.stringify(store));
        settingsPayload.downloadMode = downloadMode;
        
        // Run real Electron command
        // @ts-expect-error - electron is injected by preload
        await window.electron.executeDownload({ 
          id: Date.now().toString(),
          url, 
          settings: settingsPayload 
        });
        setStatus("Download complete!");
        setProgress(100);
      } else {
        // Mock fallback for browser environment
        setStatus("Mocking download... (Electron not detected)");
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += Math.random() * 15;
          if (currentProgress > 100) currentProgress = 100;
          setProgress(currentProgress);
          
          if (currentProgress > 30 && currentProgress < 60) setStatus("Downloading video stream...");
          else if (currentProgress >= 60 && currentProgress < 90) setStatus("Downloading audio stream...");
          else if (currentProgress >= 90 && currentProgress < 100) setStatus("Merging streams...");
          
          if (currentProgress === 100) {
            clearInterval(interval);
            setStatus("Download complete");
            setTimeout(() => {
              setIsFetching(false);
              setUrl("");
            }, 2000);
          }
        }, 500);
        return;
      }
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${String(err)}`);
    } finally {
      setTimeout(() => {
        setIsFetching(false);
        if (progress >= 100) setUrl("");
      }, 3000);
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
    return null;
  };

  const detectedPlatform = getDetectedPlatform(url);

  const getAvailableModes = (platform: string | null): Array<'video' | 'audio' | 'image'> => {
    switch (platform) {
      case 'Spotify':
      case 'SoundCloud':
        return ['audio'];
      case 'Instagram':
      case 'Reddit':
      case 'Pinterest':
      case 'X / Twitter':
      case 'Tumblr':
        return ['video', 'image'];
      case 'YouTube':
      case 'TikTok':
        return ['video', 'audio', 'image'];
      case 'Facebook':
      case 'Twitch':
      case 'VK':
      case 'Streamable':
      case 'Kick':
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

  if (isSettingsOpen) {
    return <SettingsPanel onClose={() => setIsSettingsOpen(false)} />;
  }

  return (
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
                  <li>Facebook</li>
                  <li>Twitch</li>
                  <li>VK</li>
                  <li>Streamable</li>
                  <li>Pinterest</li>
                  <li>SoundCloud</li>
                  <li>Spotify</li>
                  <li>Tumblr</li>
                  <li>Kick</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
              onChange={(e) => setUrl(e.target.value)}
              disabled={isFetching}
              required
            />
            <button 
              type="submit" 
              className={styles.fetchButton}
              disabled={isFetching || !url.trim()}
            >
              Fetch
            </button>
          </form>

          <AnimatePresence>
            {detectedPlatform && !isFetching && progress === 0 && (
              <motion.div
                className={styles.platformDetector}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className={`${styles.glowingDot} ${status.toLowerCase().includes('error') ? styles.error : ''}`} />
                <span><strong>{detectedPlatform}</strong> link detected</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`${styles.progressArea} ${isFetching || progress > 0 ? styles.visible : ''}`}>
          <div className={styles.track}>
            <div className={styles.bar} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.status}>
            <span>{status || "Ready"}</span>
            {speed && <span className={styles.meta}>{speed}</span>}
            {eta && <span className={styles.meta}>ETA: {eta}</span>}
          </div>
        </div>
      </div>
    </main>
  );
}
