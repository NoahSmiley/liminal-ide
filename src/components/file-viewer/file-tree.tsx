import { useCallback, useState } from "react";
import type { TreeNode } from "../../types/fs-types";
import { RenameInput } from "./rename-input";
import { fileTypeDotColor } from "../../lib/file-type-color";

interface FileTreeProps {
  nodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  onExpand: (path: string) => void;
  onPinFile?: (path: string) => void;
  onContextMenu?: (node: TreeNode, x: number, y: number) => void;
  renamingPath?: string | null;
  onRenameSubmit?: (newName: string) => void;
  onRenameCancel?: () => void;
}

export function FileTree({ nodes, onSelect, onExpand, onPinFile, onContextMenu, renamingPath, onRenameSubmit, onRenameCancel }: FileTreeProps) {
  return (
    <div className="text-[12px]">
      {nodes.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={0}
          onSelect={onSelect}
          onExpand={onExpand}
          onPinFile={onPinFile}
          onContextMenu={onContextMenu}
          renamingPath={renamingPath}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  );
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  onSelect: (node: TreeNode) => void;
  onExpand: (path: string) => void;
  onPinFile?: (path: string) => void;
  onContextMenu?: (node: TreeNode, x: number, y: number) => void;
  renamingPath?: string | null;
  onRenameSubmit?: (newName: string) => void;
  onRenameCancel?: () => void;
}

function TreeRow({ node, depth, onSelect, onExpand, onPinFile, onContextMenu, renamingPath, onRenameSubmit, onRenameCancel }: TreeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isRenaming = renamingPath === node.path;

  const handleClick = useCallback(() => {
    if (node.is_dir) {
      if (!expanded && !node.children) onExpand(node.path);
      setExpanded((prev) => !prev);
    } else {
      onSelect(node);
    }
  }, [node, expanded, onSelect, onExpand]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.is_dir && onPinFile) onPinFile(node.path);
  }, [node, onPinFile]);

  return (
    <>
      <div
        className="group flex items-center gap-1 px-1 py-0.5 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={isRenaming ? undefined : handleClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(node, e.clientX, e.clientY); }}
      >
        <span className="text-zinc-700 w-3 text-center shrink-0 text-[10px]">
          {node.is_dir ? (expanded ? "▾" : "▸") : ""}
        </span>
        {!node.is_dir && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 opacity-60 ${fileTypeDotColor(node.name)}`} />
        )}
        {isRenaming && onRenameSubmit && onRenameCancel ? (
          <RenameInput
            currentName={node.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className={`flex-1 truncate ${node.is_dir ? "text-zinc-500" : "text-zinc-500"}`}>{node.name}</span>
        )}
        {!isRenaming && !node.is_dir && onPinFile && (
          <button
            onClick={handlePin}
            className="hidden group-hover:block text-zinc-700 hover:text-cyan-400 text-[9px] shrink-0"
            title="pin"
          >
            #
          </button>
        )}
      </div>
      {expanded && node.children?.map((child) => (
        <TreeRow
          key={child.path}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          onExpand={onExpand}
          onPinFile={onPinFile}
          onContextMenu={onContextMenu}
          renamingPath={renamingPath}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </>
  );
}
