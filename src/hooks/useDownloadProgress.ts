import { useEffect, useRef, useState } from "react";
import type { SettingsState } from "@/store/useSettingsStore";

export type DownloadMode = "video" | "audio" | "image";
type DownloadRequest = Omit<SettingsState, "setSetting" | "reset"> & {
  downloadMode: DownloadMode;
  fullPlaylist: boolean;
};
type Progress = { id: string; status: string; progress_percent: number; speed: string; eta: string };
type DownloadResult =
  | { status: "completed"; directory: string; files: { name: string; format: string }[]; warning: string }
  | { status: "failed"; message: string }
  | { status: "cancelled" };

type DesktopDownload = {
  executeDownload(request: { id: string; url: string; settings: DownloadRequest }): Promise<DownloadResult>;
  getDownloadContext(): Promise<string>;
  cancelDownload(id: string): Promise<void>;
  onDownloadProgress(callback: (progress: Progress) => void): () => void;
  showDownloadedFile(request: { id: string; index: number; reveal: boolean }): Promise<string>;
};

function desktop() {
  return (window as Window & { electron?: DesktopDownload }).electron;
}

export function useDownloadProgress() {
  const active = useRef<string | null>(null);
  const [defaultDirectory, setDefaultDirectory] = useState("");
  const [progress, setProgress] = useState<Progress>();
  const [result, setResult] = useState<DownloadResult>();
  const [completedId, setCompletedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controls = desktop();
    if (!controls) return;
    void controls.getDownloadContext().then(setDefaultDirectory).catch(console.error);
    return controls.onDownloadProgress((event) => {
      if (event.id === active.current) setProgress(event);
    });
  }, []);

  async function download(url: string, settings: DownloadRequest) {
    if (active.current) return;
    const controls = desktop();
    if (!controls) return;

    const id = crypto.randomUUID();
    active.current = id;
    setBusy(true);
    setActionError("");
    setResult(undefined);
    setProgress({ id, status: "Preparing download…", progress_percent: 0, speed: "", eta: "" });
    try {
      const outcome = await controls.executeDownload({ id, url, settings });
      setResult(outcome);
      if (outcome.status === "completed") setCompletedId(id);
      return outcome;
    } catch {
      setResult({ status: "failed", message: "Viddax couldn’t start the download. Try again." });
    } finally {
      active.current = null;
      setBusy(false);
      setCancelling(false);
    }
  }

  async function cancel() {
    if (!active.current || cancelling) return;
    setCancelling(true);
    try {
      await desktop()?.cancelDownload(active.current);
    } catch {
      setCancelling(false);
      setActionError("Viddax couldn’t cancel this download. Try again.");
    }
  }

  async function showFile(index: number, reveal: boolean) {
    try {
      setActionError(await desktop()?.showDownloadedFile({ id: completedId, index, reveal }) || "");
    } catch {
      setActionError("Viddax couldn’t find that file.");
    }
  }

  function clearFeedback() {
    setResult(undefined);
    setActionError("");
  }

  return { defaultDirectory, progress, result, busy, cancelling, actionError, download, cancel, showFile, clearFeedback };
}
