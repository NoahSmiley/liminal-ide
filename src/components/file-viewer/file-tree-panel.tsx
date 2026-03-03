import { useCallback, useEffect, useRef, useState } from "react";
import type { TreeNode } from "../../types/fs-types";
import { FileTree } from "./file-tree";

interface FileTreePanelProps {
  nodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  onExpand: (path: string) => void;
  onCreateFile: (path: string) => void;
  onPinFile?: (path: string) => void;
}

export function FileTreePanel({ nodes, onSelect, onExpand, onCreateFile, onPinFile }: FileTreePanelProps) {
  const [creating, setCreating] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) onCreateFile(trimmed);
    setValue("");
    setCreating(false);
  }, [value, onCreateFile]);

  const cancel = useCallback(() => {
    setValue("");
    setCreating(false);
  }, []);

  return (
    <div data-tutorial="file-tree-panel" className="flex flex-col p-2 pt-1">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider">files</span>
        <button
          className="text-zinc-600 hover:text-zinc-400 text-[11px]"
          onClick={() => setCreating(true)}
        >
          +
        </button>
      </div>
      {creating && (
        <input
          ref={inputRef}
          className="w-full bg-transparent border-b border-zinc-800 text-zinc-300 text-[11px] px-1 py-0.5 mb-2 outline-none focus:border-zinc-600"
          placeholder="path/to/file.ts"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={cancel}
        />
      )}
      <FileTree nodes={nodes} onSelect={onSelect} onExpand={onExpand} onPinFile={onPinFile} />
    </div>
  );
}
