import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TreeNode } from "../types/fs-types";

interface MentionSuggestion {
  path: string;
  name: string;
}

export function useMentionAutocomplete() {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [active, setActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const search = useCallback(async (partial: string) => {
    if (!partial) { setSuggestions([]); setActive(false); return; }
    try {
      const nodes = await invoke<TreeNode[]>("list_tree", { path: ".", depth: 3 });
      const flat = flattenNodes(nodes);
      const filtered = flat
        .filter((n) => n.name.toLowerCase().includes(partial.toLowerCase()))
        .slice(0, 8);
      setSuggestions(filtered);
      setActive(filtered.length > 0);
      setSelectedIndex(0);
    } catch {
      setSuggestions([]);
      setActive(false);
    }
  }, []);

  const close = useCallback(() => {
    setSuggestions([]);
    setActive(false);
    setSelectedIndex(0);
  }, []);

  const moveSelection = useCallback((delta: number) => {
    setSelectedIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return suggestions.length - 1;
      if (next >= suggestions.length) return 0;
      return next;
    });
  }, [suggestions.length]);

  return { suggestions, active, selectedIndex, search, close, moveSelection };
}

function flattenNodes(nodes: TreeNode[]): MentionSuggestion[] {
  const result: MentionSuggestion[] = [];
  for (const node of nodes) {
    if (!node.is_dir) {
      result.push({ path: node.path, name: node.name });
    }
    if (node.children) {
      result.push(...flattenNodes(node.children));
    }
  }
  return result;
}
