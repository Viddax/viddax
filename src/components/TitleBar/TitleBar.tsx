"use client";

import { useEffect, useRef, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import styles from './TitleBar.module.scss';

type UpdateState = {
  currentVersion: string;
  version: string | null;
  percent: number;
  phase: 'idle' | 'unavailable' | 'checking' | 'current' | 'downloading' | 'ready' | 'installing' | 'error';
};

type DesktopControls = {
  getUpdateState: () => Promise<UpdateState>;
  onUpdateState: (callback: (state: UpdateState) => void) => () => void;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<boolean>;
  openReleaseNotes: () => Promise<void>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
};

function desktop() {
  return (window as Window & { electron?: DesktopControls }).electron;
}

function updateMessage(state: UpdateState) {
  switch (state.phase) {
    case 'unavailable': return 'Updates are available in installed Windows builds.';
    case 'checking': return 'Checking for updates…';
    case 'current': return 'You’re on the latest version.';
    case 'downloading': return `Downloading v${state.version} · ${state.percent}%`;
    case 'ready': return `Viddax v${state.version} is ready to install.`;
    case 'installing': return 'Restarting to install the update…';
    case 'error': return 'The update failed. Try checking again.';
    default: return 'Check for a newer version.';
  }
}

export function TitleBar() {
  const [update, setUpdate] = useState<UpdateState>();
  const [message, setMessage] = useState('');
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const updatesRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controls = desktop();
    if (!controls) return;
    let active = true;
    let receivedEvent = false;
    const unsubscribe = controls.onUpdateState((state) => {
      receivedEvent = true;
      setUpdate(state);
    });
    void controls.getUpdateState().then((state) => {
      if (active && !receivedEvent) setUpdate(state);
    }).catch(console.error);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!updatesOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !updatesRef.current?.contains(event.target)) {
        setUpdatesOpen(false);
      }
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUpdatesOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissWithEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissWithEscape);
    };
  }, [updatesOpen]);

  const handleInstall = async () => {
    setMessage('');
    try {
      if (!(await desktop()?.installUpdate())) {
        setMessage('If a download is active, wait for it to finish and try again.');
      }
    } catch {
      setMessage('Could not restart Viddax. Try again.');
    }
  };

  const busy = update && ['unavailable', 'checking', 'downloading', 'installing'].includes(update.phase);

  return (
    <div className={styles.titlebar}>
      <div className={styles.dragRegion}>
        <span className={styles.brand}>Viddax</span>
        {update && (
          <div className={styles.updates} ref={updatesRef}>
            <button
              type="button"
              ref={triggerRef}
              className={`${styles.versionButton} ${update.phase === 'ready' ? styles.ready : ''}`}
              aria-label={`Viddax v${update.currentVersion} updates`}
              aria-expanded={updatesOpen}
              aria-controls="viddax-updates"
              onClick={() => setUpdatesOpen((open) => !open)}
            >
              {update.phase === 'ready' ? 'Update ready' : update.phase === 'downloading' ? `Updating · ${update.percent}%` : `v${update.currentVersion}`}
            </button>
            <div id="viddax-updates" className={styles.updatePanel} data-open={updatesOpen} inert={!updatesOpen}>
              <strong>Viddax v{update.currentVersion}</strong>
              <p role="status">{updateMessage(update)}</p>
              {message && <p role="status">{message}</p>}
              <div className={styles.updateActions}>
                {update.phase === 'ready' ? (
                  <button type="button" onClick={() => void handleInstall()}>Restart and install</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => {
                    setMessage('');
                    void desktop()?.checkForUpdate().catch(() => setMessage('Could not check for updates.'));
                  }}>Check for updates</button>
                )}
                <button type="button" onClick={() => {
                  void desktop()?.openReleaseNotes().catch(() => setMessage('Could not open release notes.'));
                }}>What’s new</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={() => desktop()?.minimizeWindow()} aria-label="Minimize">
          <Minus size={18} strokeWidth={1.5} />
        </button>
        <button className={styles.controlButton} onClick={() => desktop()?.maximizeWindow()} aria-label="Maximize">
          <Square size={14} strokeWidth={1.5} />
        </button>
        <button className={`${styles.controlButton} ${styles.closeButton}`} onClick={() => desktop()?.closeWindow()} aria-label="Close">
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
