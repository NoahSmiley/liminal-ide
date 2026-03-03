import { useEffect } from "react";
import { TuiPanel } from "../shared/tui-panel";
import type { TodoItem } from "../../types/todo-types";

interface TodoPanelProps {
  groupedByFile: Record<string, TodoItem[]>;
  loading: boolean;
  onScan: () => void;
  onOpenFile: (path: string, line: number) => void;
  onFixWithAi: (item: TodoItem) => void;
  onClose: () => void;
}

function kindColor(kind: string): string {
  switch (kind) {
    case "FIXME": return "text-red-400";
    case "HACK": return "text-amber-400";
    case "XXX": return "text-purple-400";
    default: return "text-cyan-400";
  }
}

export function TodoPanel({
  groupedByFile, loading, onScan, onOpenFile, onFixWithAi, onClose,
}: TodoPanelProps) {
  useEffect(() => { onScan(); }, [onScan]);

  const files = Object.keys(groupedByFile);
  const total = Object.values(groupedByFile).reduce((s, items) => s + items.length, 0);

  return (
    <TuiPanel
      title="todos"
      className="mx-3 mb-2 max-h-[50vh] flex flex-col"
      dataTutorial="todo-panel"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={onScan} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            refresh
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            esc
          </button>
        </div>
      }
    >
      {loading && <div className="text-[10px] text-zinc-600">scanning...</div>}
      {!loading && (
        <div className="text-[10px] text-zinc-600 mb-1">
          {total} item{total !== 1 ? "s" : ""} in {files.length} file{files.length !== 1 ? "s" : ""}
        </div>
      )}
      <div className="overflow-y-auto flex-1 min-h-0">
        {files.map((file) => (
          <div key={file} className="mb-2">
            <div className="text-[10px] text-zinc-400 truncate">{file}</div>
            {(groupedByFile[file] ?? []).map((item) => (
              <div
                key={`${file}:${item.line_number}`}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] hover:bg-zinc-900/50"
              >
                <span className={`shrink-0 font-bold ${kindColor(item.kind)}`}>{item.kind}</span>
                <button
                  onClick={() => onOpenFile(item.path, item.line_number)}
                  className="text-zinc-500 hover:text-zinc-300 truncate flex-1 text-left"
                >
                  <span className="text-zinc-700 mr-1">:{item.line_number}</span>
                  {item.text}
                </button>
                <button
                  onClick={() => onFixWithAi(item)}
                  className="text-zinc-700 hover:text-cyan-400 shrink-0 text-[9px]"
                >
                  fix
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </TuiPanel>
  );
}
