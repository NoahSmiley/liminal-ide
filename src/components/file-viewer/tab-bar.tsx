import type { FileBuffer } from "../../hooks/use-open-files";

interface TabBarProps {
  files: Map<string, FileBuffer>;
  activeFile: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function filename(path: string): string {
  return path.split("/").pop() ?? path;
}

export function TabBar({ files, activeFile, onSelect, onClose }: TabBarProps) {
  const paths = Array.from(files.keys());

  if (paths.length === 0) return null;

  return (
    <div data-tutorial="tab-bar" className="flex items-center gap-0 border-b border-zinc-800 overflow-x-auto text-[10px]">
      {paths.map((path) => {
        const fb = files.get(path);
        const isActive = path === activeFile;
        return (
          <button
            key={path}
            onClick={() => onSelect(path)}
            className={`flex items-center gap-1 px-2 py-1 border-r border-zinc-800/60 shrink-0 ${
              isActive ? "text-zinc-200 bg-zinc-900/50" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {fb?.dirty && <span className="text-amber-500 text-[8px]">*</span>}
            <span className="truncate max-w-[120px]">{filename(path)}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onClose(path); }}
              className="ml-1 text-zinc-700 hover:text-zinc-400"
              role="button"
            >
              x
            </span>
          </button>
        );
      })}
    </div>
  );
}
