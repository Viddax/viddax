"use client";

import React, { useEffect, useState } from 'react';
import styles from './TitleBar.module.scss';
import { Minus, Square, X, DownloadCloud, RefreshCw } from 'lucide-react';

export function TitleBar() {
  const [updateStatus, setUpdateStatus] = useState<'downloading' | 'ready' | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    // @ts-expect-error - injected
    if (typeof window !== 'undefined' && window.electron) {
      // @ts-expect-error - injected
      window.electron.onUpdateProgress((progressObj: { percent: number }) => {
        setUpdateStatus('downloading');
        setUpdateProgress(Math.round(progressObj.percent));
      });

      // @ts-expect-error - injected
      window.electron.onUpdateDownloaded(() => {
        setUpdateStatus('ready');
      });
    }
  }, []);

  const handleMinimize = () => {
    // @ts-expect-error - injected
    if (window.electron?.minimizeWindow) {
      // @ts-expect-error - injected
      window.electron.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    // @ts-expect-error - injected
    if (window.electron?.maximizeWindow) {
      // @ts-expect-error - injected
      window.electron.maximizeWindow();
    }
  };

  const handleClose = () => {
    // @ts-expect-error - injected
    if (window.electron?.closeWindow) {
      // @ts-expect-error - injected
      window.electron.closeWindow();
    }
  };

  const handleRestart = () => {
    // @ts-expect-error - injected
    if (window.electron?.restartApp) {
      // @ts-expect-error - injected
      window.electron.restartApp();
    }
  };

  return (
    <div className={styles.titlebar}>
      <div className={styles.dragRegion}>
        <div className={styles.logo}>
          <span className={styles.brand}>Viddax</span>
        </div>
      </div>
      
      <div className={styles.controls}>
        {updateStatus === 'downloading' && (
          <div className={styles.updatePill}>
            <DownloadCloud size={14} className={styles.pulse} />
            <span>Downloading Update: {updateProgress}%</span>
          </div>
        )}
        
        {updateStatus === 'ready' && (
          <button className={styles.updateReadyPill} onClick={handleRestart}>
            <RefreshCw size={14} className={styles.spinHover} />
            <span>Restart to Update</span>
          </button>
        )}

        <button className={styles.controlButton} onClick={handleMinimize} aria-label="Minimize">
          <Minus size={18} strokeWidth={1} />
        </button>
        <button className={styles.controlButton} onClick={handleMaximize} aria-label="Maximize">
          <Square size={14} strokeWidth={1} />
        </button>
        <button className={`${styles.controlButton} ${styles.closeButton}`} onClick={handleClose} aria-label="Close">
          <X size={18} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
}
