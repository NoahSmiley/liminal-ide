import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TodoItem } from "../types/todo-types";

export function useTodos() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<TodoItem[]>("scan_todos");
      setItems(result);
    } catch (err) {
      console.error("TODO scan failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const groupedByFile = items.reduce<Record<string, TodoItem[]>>((acc, item) => {
    const existing = acc[item.path];
    if (existing) {
      existing.push(item);
    } else {
      acc[item.path] = [item];
    }
    return acc;
  }, {});

  return { items, groupedByFile, loading, scan };
}
