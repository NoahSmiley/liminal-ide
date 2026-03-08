import { useEffect, useState } from "react";
import type { TodoItem } from "../../types/todo-types";

interface TodoPanelProps {
  groupedByFile: Record<string, TodoItem[]>;
  loading: boolean;
  onScan: () => void;
  onOpenFile: (path: string, line: number) => void;
  onFixWithAi: (item: TodoItem) => void;
}

// ─── Kind badge ───────────────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    FIXME: "text-red-400 bg-red-500/10",
    HACK: "text-amber-400 bg-amber-500/10",
    XXX: "text-purple-400 bg-purple-500/10",
    TODO: "text-cyan-400 bg-cyan-500/10",
  };
  const cls = styles[kind] ?? "text-zinc-400 bg-zinc-500/10";

  return (
    <span
      className={`shrink-0 text-[9px] font-bold px-[3px] py-[1px] rounded-[2px] leading-none select-none ${cls}`}
    >
      {kind}
    </span>
  );
}

// ─── File group ────────────────────────────────────────────────────────────────

function FileGroup({
  file,
  items,
  onOpenFile,
  onFixWithAi,
}: {
  file: string;
  items: TodoItem[];
  onOpenFile: (path: string, line: number) => void;
  onFixWithAi: (item: TodoItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const fileName = file.split("/").pop() ?? file;
  const dirPath = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : "";

  return (
    <div>
      {/* File header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center w-full text-left h-[22px] px-2 hover:bg-white/[0.04] select-none group"
      >
        <span className="text-[10px] text-zinc-500 mr-1.5 w-2.5 shrink-0">
          {collapsed ? "▸" : "▾"}
        </span>
        <span className="text-[10px] text-zinc-300 font-medium truncate">{fileName}</span>
        {dirPath && (
          <span className="text-[10px] text-zinc-600 ml-1 truncate flex-1 text-left">
            {dirPath}
          </span>
        )}
        <span className="text-[10px] text-zinc-600 shrink-0 ml-1">{items.length}</span>
      </button>

      {/* Todo rows */}
      {!collapsed &&
        items.map((item) => (
          <div
            key={`${file}:${item.line_number}`}
            className="flex items-center h-[22px] pl-6 pr-1 hover:bg-white/[0.04] group"
          >
            <KindBadge kind={item.kind} />
            <button
              onClick={() => onOpenFile(item.path, item.line_number)}
              className="flex-1 min-w-0 flex items-baseline ml-1.5 text-left"
            >
              <span className="text-[10px] text-zinc-600 tabular-nums mr-1 shrink-0">
                :{item.line_number}
              </span>
              <span className="text-[10px] text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">
                {item.text}
              </span>
            </button>
            <button
              onClick={() => onFixWithAi(item)}
              title="fix with AI"
              className="shrink-0 text-[9px] text-zinc-700 hover:text-cyan-400 transition-colors px-1 opacity-0 group-hover:opacity-100"
            >
              fix
            </button>
          </div>
        ))}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function TodoPanel({
  groupedByFile,
  loading,
  onScan,
  onOpenFile,
  onFixWithAi,
}: TodoPanelProps) {
  useEffect(() => {
    onScan();
  }, [onScan]);

  const files = Object.keys(groupedByFile);
  const total = Object.values(groupedByFile).reduce((s, items) => s + items.length, 0);

  return (
    <div className="flex flex-col h-full" data-tutorial="todo-panel">
      {/* Toolbar */}
      <div className="flex items-center h-[30px] px-2 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] text-zinc-600 flex-1 select-none">
          {loading ? "scanning..." : `${total} item${total !== 1 ? "s" : ""} in ${files.length} file${files.length !== 1 ? "s" : ""}`}
        </span>
        <button
          onClick={onScan}
          title="scan"
          disabled={loading}
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] disabled:opacity-40 transition-colors text-[11px]"
        >
          ↻
        </button>
      </div>

      {/* File groups */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {!loading && files.length === 0 && (
          <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">no items found</div>
        )}
        {files.map((file) => (
          <FileGroup
            key={file}
            file={file}
            items={groupedByFile[file] ?? []}
            onOpenFile={onOpenFile}
            onFixWithAi={onFixWithAi}
          />
        ))}
      </div>
    </div>
  );
}
