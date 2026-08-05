"use client";

import React from 'react';
import styles from './TitleBar.module.scss';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
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

  return (
    <div className={styles.titlebar}>
      <div className={styles.dragRegion}>
        <div className={styles.logo}>
          <span className={styles.brand}>Viddax</span>
        </div>
      </div>
      <div className={styles.controls}>
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
