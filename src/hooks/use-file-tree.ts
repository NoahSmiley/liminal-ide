import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

export function useFileTree() {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (path = ".") => {
    try {
      const result = await invoke<DirEntry[]>("list_directory", { path });
      setEntries(result);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleFsEvent = useCallback(() => {
    refresh();
  }, [refresh]);

  useTauriEvent("fs:event", handleFsEvent);

  return { entries, error, refresh };
}
