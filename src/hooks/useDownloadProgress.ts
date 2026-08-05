import { useState, useEffect } from 'react';

export interface ProgressPayload {
  status: string;
  progress_percent: number;
  speed: string;
  eta: string;
}

export function useDownloadProgress() {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [speed, setSpeed] = useState<string>('');
  const [eta, setEta] = useState<string>('');

  useEffect(() => {
    // Check if we are running inside Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.onDownloadProgress((payload: ProgressPayload) => {
        setProgress(payload.progress_percent);
        setStatus(payload.status);
        setSpeed(payload.speed);
        setEta(payload.eta);
      });
    }
  }, []);

  return { progress, status, speed, eta, setProgress, setStatus };
}
