import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TreeNode } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

export function useFileTree() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (path = ".") => {
    try {
      const result = await invoke<TreeNode[]>("list_tree", { path, depth: 1 });
      setNodes(result);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const expandDir = useCallback(async (dirPath: string) => {
    try {
      const children = await invoke<TreeNode[]>("list_tree", {
        path: dirPath,
        depth: 1,
      });
      setNodes((prev) => insertChildren(prev, dirPath, children));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleFsEvent = useCallback(() => {
    refresh();
  }, [refresh]);

  useTauriEvent("fs:event", handleFsEvent);

  return { nodes, error, refresh, expandDir };
}

function insertChildren(
  tree: TreeNode[],
  targetPath: string,
  children: TreeNode[],
): TreeNode[] {
  return tree.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children) {
      return {
        ...node,
        children: insertChildren(node.children, targetPath, children),
      };
    }
    return node;
  });
}
