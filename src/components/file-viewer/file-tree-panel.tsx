import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TreeNode } from "../../types/fs-types";
import { FileTree } from "./file-tree";
import { TreeContextMenu } from "./tree-context-menu";
import { RenameInput } from "./rename-input";

interface FileTreePanelProps {
  nodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  onExpand: (path: string) => void;
  onCreateFile: (path: string) => void;
  onPinFile?: (path: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode | null; // null = empty space
}

export function FileTreePanel({ nodes, onSelect, onExpand, onCreateFile, onPinFile }: FileTreePanelProps) {
  const [creating, setCreating] = useState<"file" | "folder" | false>(false);
  const [createParent, setCreateParent] = useState<string>(""); // parent dir for new file/folder
  const [value, setValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) { cancel(); return; }

    const fullPath = createParent ? `${createParent}/${trimmed}` : trimmed;

    if (creating === "folder") {
      // Create folder by writing a placeholder then deleting, or use write_file with trailing /
      invoke("write_file", { path: fullPath + "/.gitkeep", content: "" }).catch(console.error);
    } else {
      onCreateFile(fullPath);
    }
    setValue("");
    setCreating(false);
    setCreateParent("");
  }, [value, creating, createParent, onCreateFile]);

  const cancel = useCallback(() => {
    setValue("");
    setCreating(false);
    setCreateParent("");
  }, []);

  const startCreate = useCallback((type: "file" | "folder", parent: string = "") => {
    setCreateParent(parent);
    setCreating(type);
    setValue("");
  }, []);

  // Context menu for nodes
  const handleNodeContextMenu = useCallback((node: TreeNode, x: number, y: number) => {
    setContextMenu({ x, y, node });
  }, []);

  // Context menu for empty space
  const handleEmptyContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Build context menu actions
  const getActions = useCallback(() => {
    const node = contextMenu?.node;
    if (!node) {
      // Empty space context menu
      return [
        { label: "New File", action: () => startCreate("file") },
        { label: "New Folder", action: () => startCreate("folder") },
      ];
    }

    if (node.is_dir) {
      return [
        { label: "New File", action: () => startCreate("file", node.path) },
        { label: "New Folder", action: () => startCreate("folder", node.path) },
        { label: "Rename", action: () => setRenamingPath(node.path) },
        { label: "Copy Path", action: () => navigator.clipboard.writeText(node.path) },
        {
          label: "Delete",
          danger: true,
          action: () => {
            invoke("delete_file", { path: node.path }).catch(console.error);
          },
        },
      ];
    }

    // File context menu
    const actions = [
      { label: "Open", action: () => onSelect(node) },
      { label: "Rename", action: () => setRenamingPath(node.path) },
      { label: "Copy Path", action: () => navigator.clipboard.writeText(node.path) },
    ];

    if (onPinFile) {
      actions.push({ label: "Pin to Context", action: () => onPinFile(node.path) });
    }

    actions.push({
      label: "Delete",
      danger: true,
      action: () => {
        invoke("delete_file", { path: node.path }).catch(console.error);
      },
    });

    return actions;
  }, [contextMenu, onSelect, onPinFile, startCreate]);

  // Rename handler
  const handleRename = useCallback(async (newName: string) => {
    if (!renamingPath) return;
    const parts = renamingPath.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");
    try {
      await invoke("rename_file", { oldPath: renamingPath, newPath });
    } catch (err) {
      console.error("Rename failed:", err);
    }
    setRenamingPath(null);
  }, [renamingPath]);

  return (
    <div
      data-tutorial="file-tree-panel"
      className="flex flex-col p-2 pt-1 h-full"
      onContextMenu={handleEmptyContextMenu}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">files</span>
        <button
          className="text-zinc-600 hover:text-zinc-400 text-[11px]"
          onClick={() => startCreate("file")}
        >
          +
        </button>
      </div>
      {creating && (
        <input
          ref={inputRef}
          className="w-full bg-transparent border-b border-zinc-800 text-zinc-300 text-[11px] px-1 py-0.5 mb-2 outline-none focus:border-zinc-600"
          placeholder={creating === "folder" ? "folder-name" : "path/to/file.ts"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={cancel}
        />
      )}
      <FileTree
        nodes={nodes}
        onSelect={onSelect}
        onExpand={onExpand}
        onPinFile={onPinFile}
        onContextMenu={handleNodeContextMenu}
        renamingPath={renamingPath}
        onRenameSubmit={handleRename}
        onRenameCancel={() => setRenamingPath(null)}
      />

      {contextMenu && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={getActions()}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
