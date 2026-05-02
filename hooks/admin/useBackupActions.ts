"use client";

import { useCallback, useState } from "react";
import type { BackupArtifact, BackupStatus } from "@/lib/types";

export function useBackupActions(api: (url: string, options?: RequestInit) => Promise<Response>) {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupArtifacts, setBackupArtifacts] = useState<BackupArtifact[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fetchBackupStatus = useCallback(async () => {
    try {
      setBackupLoading(true);
      setBackupError(null);
      const payload = await (await api("/api/backups/status")).json() as { status: BackupStatus; artifacts: BackupArtifact[] };
      setBackupStatus(payload.status);
      setBackupArtifacts(payload.artifacts);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Unable to load backup status.");
    } finally {
      setBackupLoading(false);
    }
  }, [api]);

  const runBackupNow = useCallback(async () => {
    try {
      setBackupRunning(true);
      setBackupError(null);
      await api("/api/backups/run", { method: "POST" });
      await fetchBackupStatus();
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Unable to run backup.");
      throw error;
    } finally {
      setBackupRunning(false);
    }
  }, [api, fetchBackupStatus]);

  const downloadLocalBackup = useCallback((kind: "bundle" | "secrets") => {
    window.location.href = kind === "bundle" ? "/api/backups/download?kind=bundle" : "/api/backups/download?kind=secrets";
  }, []);

  return {
    backupStatus,
    backupArtifacts,
    backupLoading,
    backupRunning,
    backupError,
    setBackupError,
    fetchBackupStatus,
    runBackupNow,
    downloadLocalBackup
  };
}
