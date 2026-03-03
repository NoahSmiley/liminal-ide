import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Snippet } from "../types/snippet-types";

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<Snippet[]>("list_snippets");
      setSnippets(result);
    } catch (err) {
      console.error("Failed to load snippets:", err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (title: string, language: string, content: string) => {
    await invoke("add_snippet", { title, language, content });
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await invoke("remove_snippet", { id });
    await refresh();
  }, [refresh]);

  return { snippets, add, remove, refresh };
}
