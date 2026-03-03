import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StagedTurn } from "../types/diff-types";

export function useDiffStaging() {
  const [staged, setStaged] = useState<StagedTurn | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<StagedTurn | null>("get_staged_diffs");
      setStaged(result);
    } catch (err) {
      console.error("Failed to get staged diffs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptFile = useCallback(async (path: string) => {
    await invoke("accept_diff_file", { path });
    await refresh();
  }, [refresh]);

  const rejectFile = useCallback(async (path: string) => {
    await invoke("reject_diff_file", { path });
    await refresh();
  }, [refresh]);

  const acceptAll = useCallback(async () => {
    await invoke("accept_all_diffs");
    setStaged(null);
  }, []);

  const rejectAll = useCallback(async () => {
    await invoke("reject_all_diffs");
    setStaged(null);
  }, []);

  return { staged, loading, refresh, acceptFile, rejectFile, acceptAll, rejectAll };
}
