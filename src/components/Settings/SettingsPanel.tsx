"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore, SettingsState } from "@/store/useSettingsStore";
import { SegmentedControl } from "../ui/SegmentedControl";
import { SettingToggle } from "../ui/SettingToggle";
import { SettingSection } from "../ui/SettingSection";
import { SettingInput } from "../ui/SettingInput";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import uiStyles from "../ui/ui.module.scss";
import styles from "./settings.module.scss";

const FilteredSection = ({ title, children, searchQuery }: { title: string, children: React.ReactNode, searchQuery: string }) => {
  let filtered = React.Children.toArray(children);
  let isTitleMatch = false;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    isTitleMatch = title.toLowerCase().includes(q);
    
    if (!isTitleMatch) {
      filtered = filtered.filter(child => {
        if (!React.isValidElement(child)) return false;
        const label = child.props.label || "";
        const description = child.props.description || "";
        return label.toLowerCase().includes(q) || description.toLowerCase().includes(q);
      });
    }
  }

  if (filtered.length === 0) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <SettingSection title={title}>
        <AnimatePresence mode="popLayout">
          {filtered.map((child, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              key={(child as React.ReactElement)?.key || i}
              style={{ width: '100%' }}
            >
              {child}
            </motion.div>
          ))}
        </AnimatePresence>
      </SettingSection>
    </motion.div>
  );
};

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const store = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search query to prevent jarring animation flashes while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
    }, 400); // Wait 400ms after last keystroke
    
    return () => clearTimeout(handler);
  }, [inputValue]);

  if (!mounted) return null;

  const handleReset = () => {
    setConfirmState({
      isOpen: true,
      message: "are you sure you want to reset all settings to their defaults?",
      onConfirm: () => {
        store.reset();
        setConfirmState(null);
      }
    });
  };

  const handleClearCache = () => {
    setConfirmState({
      isOpen: true,
      message: "are you sure you want to clear local storage? you will lose all preferences.",
      onConfirm: () => {
        localStorage.removeItem('viddax-settings');
        window.location.reload();
      }
    });
  };

  const getMockFilename = (style: string) => {
    switch (style) {
      case 'classic': return "YouTube_Video_2026.mp4";
      case 'basic': return "youtube video.mp4";
      case 'nerdy': return "yt_video_1080p_h264_aac.mp4";
      case 'pretty':
      default:
        return "YouTube Video (2026).mp4";
    }
  };

  const handleExport = () => {
    setConfirmState({
      isOpen: true,
      message: "are you sure you want to export your current settings to a file?",
      onConfirm: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "viddax-settings.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        setConfirmState(null);
      }
    });
  };

  const handleImport = () => {
    setConfirmState({
      isOpen: true,
      message: "are you sure you want to import settings? this will overwrite your current configuration.",
      onConfirm: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const parsed = JSON.parse(e.target?.result as string);
              Object.keys(parsed).forEach(key => {
                if (key !== 'setSetting' && key !== 'reset') {
                  store.setSetting(key as any, parsed[key]);
                }
              });
            } catch (err) {
              console.error("Invalid settings file.");
            }
          };
          reader.readAsText(file);
        };
        input.click();
        setConfirmState(null);
      }
    });
  };

  return (
    <div className={styles.container}>
      <button onClick={onClose} style={{ marginBottom: '32px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        back
      </button>
      <div className={styles.header}>
        <h1>settings</h1>
        <p>configure your viddax experience.</p>
      </div>

      <div className={styles.searchBar}>
        <input 
          type="text" 
          placeholder="search settings... (e.g., 'cookies', '4k')" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>

      <FilteredSection searchQuery={searchQuery} title="theme & language">
        <SegmentedControl
          label="theme mode"
          description="choose your visual preference."
          options={['auto', 'light', 'dark']}
          value={store.themeMode}
          onChange={(val) => store.setSetting("themeMode", val as SettingsState["themeMode"])}
        />
        <SettingToggle
          label="auto language selection"
          description="automatically detect preferred language."
          checked={store.autoLanguageSelection}
          onChange={(val) => store.setSetting("autoLanguageSelection", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="visual">
        <SettingToggle
          label="reduce motion"
          description="minimize animations across the app."
          checked={store.reduceMotion}
          onChange={(val) => store.setSetting("reduceMotion", val)}
        />
        <SettingToggle
          label="reduce transparency"
          description="disable blurs and glass effects."
          checked={store.reduceTransparency}
          onChange={(val) => store.setSetting("reduceTransparency", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="downloads & directories">
        <SettingInput
          label="default download path"
          description="absolute path where files will be saved."
          placeholder="/home/user/Downloads"
          value={store.defaultDownloadPath}
          onChange={(val) => store.setSetting("defaultDownloadPath", val)}
        />
        <SettingToggle
          label="auto create subdirectories"
          description="create folders like /youtube/ or /twitter/."
          checked={store.autoCreateSubdirectories}
          onChange={(val) => store.setSetting("autoCreateSubdirectories", val)}
        />
        <SegmentedControl
          label="folder structure"
          description="how to organize files within directories."
          options={['flat', 'by author']}
          value={store.folderStructure}
          onChange={(val) => store.setSetting("folderStructure", val as SettingsState["folderStructure"])}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="video & chapters">
        <SegmentedControl
          label="video quality"
          description="maximum preferred video resolution."
          options={['8k+', '4k', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']}
          value={store.videoQuality}
          onChange={(val) => store.setSetting("videoQuality", val as SettingsState["videoQuality"])}
        />
        <SegmentedControl
          label="youtube codec"
          description="preferred codec combination for youtube downloads."
          options={['h264 + aac', 'av1 + opus', 'vp9 + opus']}
          value={store.preferredYoutubeCodec}
          onChange={(val) => store.setSetting("preferredYoutubeCodec", val as SettingsState["preferredYoutubeCodec"])}
        />
        <SegmentedControl
          label="container format"
          description="preferred video container."
          options={['auto', 'mp4', 'webm', 'mkv']}
          value={store.youtubeContainer}
          onChange={(val) => store.setSetting("youtubeContainer", val as SettingsState["youtubeContainer"])}
        />
        <SettingToggle
          label="allow h265"
          description="permit h265 codec downloads if available."
          checked={store.allowH265}
          onChange={(val) => store.setSetting("allowH265", val)}
        />
        <SettingToggle
          label="twitter loops to gif"
          description="convert short looping twitter videos to gif format."
          checked={store.twitterConvertLoopingToGif}
          onChange={(val) => store.setSetting("twitterConvertLoopingToGif", val)}
        />
        <SettingToggle
          label="sponsorblock integration"
          description="automatically skip or remove sponsored segments."
          checked={store.sponsorBlockIntegration}
          onChange={(val) => store.setSetting("sponsorBlockIntegration", val)}
        />
        <SettingToggle
          label="split by chapters"
          description="split a long video into multiple smaller files."
          checked={store.splitByChapters}
          onChange={(val) => store.setSetting("splitByChapters", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="audio & subtitles">
        <SegmentedControl
          label="audio format"
          description="preferred extraction format."
          options={['best', 'mp3', 'ogg', 'wav', 'opus']}
          value={store.audioFormat}
          onChange={(val) => store.setSetting("audioFormat", val as SettingsState["audioFormat"])}
        />
        <SegmentedControl
          label="audio bitrate"
          description="preferred extraction bitrate."
          options={['320kbps', '256kbps', '128kbps', '96kbps', '64kbps', '8kbps']}
          value={store.audioBitrate}
          onChange={(val) => store.setSetting("audioBitrate", val as SettingsState["audioBitrate"])}
        />
        <SettingToggle
          label="embed thumbnail"
          description="embed the video thumbnail as cover art."
          checked={store.embedThumbnail}
          onChange={(val) => store.setSetting("embedThumbnail", val)}
        />
        <SettingToggle
          label="embed subtitles"
          description="embed subtitles directly into the mkv/mp4."
          checked={store.embedSubtitles}
          onChange={(val) => store.setSetting("embedSubtitles", val)}
        />
        <SettingToggle
          label="auto translate subtitles"
          description="fetch auto-translated subs if native isn't available."
          checked={store.autoTranslateSubtitles}
          onChange={(val) => store.setSetting("autoTranslateSubtitles", val)}
        />
        <SettingToggle
          label="youtube better audio"
          description="prefer higher quality audio over lower latency streams."
          checked={store.youtubeAudioQualityPreferBetter}
          onChange={(val) => store.setSetting("youtubeAudioQualityPreferBetter", val)}
        />
        <SettingToggle
          label="tiktok original sound"
          description="always download the original sound instead of edits."
          checked={store.tiktokDownloadOriginalSound}
          onChange={(val) => store.setSetting("tiktokDownloadOriginalSound", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="output & metadata">
        <SegmentedControl
          label="filename style"
          description="how saved files are named."
          options={['classic', 'basic', 'pretty', 'nerdy']}
          value={store.filenameStyle}
          onChange={(val) => store.setSetting("filenameStyle", val as SettingsState["filenameStyle"])}
        />
        {(!searchQuery || "filename style".includes(searchQuery.toLowerCase())) && (
          <div className={styles.mockPreview}>
            <span className={styles.fileIcon}>📄</span>
            <span className={styles.fileName}>{getMockFilename(store.filenameStyle)}</span>
          </div>
        )}

        <SegmentedControl
          label="saving method"
          description="default action when download finishes."
          options={['ask', 'download', 'share', 'copy']}
          value={store.savingMethod}
          onChange={(val) => store.setSetting("savingMethod", val as SettingsState["savingMethod"])}
        />
        <SettingToggle
          label="disable file metadata"
          description="strip id3 tags and metadata from downloads."
          checked={store.disableFileMetadata}
          onChange={(val) => store.setSetting("disableFileMetadata", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="network & rate limiting">
        <SegmentedControl
          label="max concurrent downloads"
          description="prevent network congestion or ip bans."
          options={['1', '3', '5', '10']}
          value={store.maxConcurrentDownloads}
          onChange={(val) => store.setSetting("maxConcurrentDownloads", val as SettingsState["maxConcurrentDownloads"])}
        />
        <SegmentedControl
          label="rate limit"
          description="throttle download speeds for shared networks."
          options={['unlimited', '5mb/s', '1mb/s']}
          value={store.rateLimit}
          onChange={(val) => store.setSetting("rateLimit", val as SettingsState["rateLimit"])}
        />
        <SegmentedControl
          label="retry on failure"
          description="automatically retry failed downloads."
          options={['0', '3', '5', 'infinite']}
          value={store.retryOnFailure}
          onChange={(val) => store.setSetting("retryOnFailure", val as SettingsState["retryOnFailure"])}
        />
        <SettingInput
          label="proxy string"
          description="socks5 or http proxy to bypass region locks."
          placeholder="socks5://user:pass@host:port"
          value={store.proxyString}
          onChange={(val) => store.setSetting("proxyString", val)}
        />
        <SettingToggle
          label="use custom server"
          description="route downloads through a custom proxy server."
          checked={store.useCustomServer}
          onChange={(val) => store.setSetting("useCustomServer", val)}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="authentication">
        <SettingToggle
          label="use cookies"
          description="allow app to read browser cookies for age-restricted content."
          checked={store.useCookies}
          onChange={(val) => store.setSetting("useCookies", val)}
        />
        <SegmentedControl
          label="browser identity"
          description="impersonate specific browsers to avoid bot detection."
          options={['chrome', 'firefox', 'safari', 'edge']}
          value={store.browserIdentity}
          onChange={(val) => store.setSetting("browserIdentity", val as SettingsState["browserIdentity"])}
        />
      </FilteredSection>

      <FilteredSection searchQuery={searchQuery} title="debug & advanced">
        <SettingToggle
          label="enable nerd features"
          description="show advanced debugging tools and raw state."
          checked={store.enableNerdFeatures}
          onChange={(val) => store.setSetting("enableNerdFeatures", val)}
        />
        
        {store.enableNerdFeatures && (!searchQuery || "enable nerd features".includes(searchQuery.toLowerCase())) && (
          <div className={styles.jsonViewer}>
            <pre>{JSON.stringify(store, null, 2)}</pre>
          </div>
        )}

        <div className={styles.dangerZone}>
          <button className={uiStyles.button} onClick={handleExport}>export settings</button>
          <button className={uiStyles.button} onClick={handleImport}>import settings</button>
          <button className={`${uiStyles.button} ${uiStyles.danger}`} onClick={handleReset}>reset to defaults</button>
          <button className={`${uiStyles.button} ${uiStyles.danger}`} onClick={handleClearCache}>clear cache</button>
        </div>
      </FilteredSection>

      <ConfirmDialog 
        isOpen={!!confirmState?.isOpen} 
        message={confirmState?.message || ""} 
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
