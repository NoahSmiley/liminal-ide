import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PinnedContext } from "../types/context-types";

export function usePinnedContext() {
  const [pins, setPins] = useState<PinnedContext[]>([]);

  const refresh = useCallback(async () => {
    const list = await invoke<PinnedContext[]>("list_pinned");
    setPins(list);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const pinFile = useCallback(async (path: string) => {
    await invoke("pin_file", { path });
    await refresh();
  }, [refresh]);

  const pinText = useCallback(async (label: string, content: string) => {
    await invoke("pin_context", { label, content });
    await refresh();
  }, [refresh]);

  const unpin = useCallback(async (id: string) => {
    await invoke("unpin_context", { id });
    await refresh();
  }, [refresh]);

  return { pins, pinFile, pinText, unpin };
}
