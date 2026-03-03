import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitStatus, GitCommit, GitFileDiff } from "../types/git-types";

export function useGit() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [diffs, setDiffs] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await invoke<GitStatus>("get_git_status");
      setStatus(result);
    } catch (err) {
      console.error("git status failed:", err);
    }
  }, []);

  const refreshLog = useCallback(async (limit?: number) => {
    try {
      const result = await invoke<GitCommit[]>("get_git_log", {
        limit: limit ?? 20,
      });
      setCommits(result);
    } catch (err) {
      console.error("git log failed:", err);
    }
  }, []);

  const refreshDiff = useCallback(async () => {
    try {
      const result = await invoke<GitFileDiff[]>("get_git_diff");
      setDiffs(result);
    } catch (err) {
      console.error("git diff failed:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshStatus(), refreshLog(), refreshDiff()]);
    } finally {
      setLoading(false);
    }
  }, [refreshStatus, refreshLog, refreshDiff]);

  return {
    status,
    commits,
    diffs,
    loading,
    refreshStatus,
    refreshLog,
    refreshDiff,
    refreshAll,
  };
}
