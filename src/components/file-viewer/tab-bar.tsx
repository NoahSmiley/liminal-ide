import type { FileBuffer } from "../../hooks/use-open-files";
import { fileTypeDotColor } from "../../lib/file-type-color";

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
    <div data-tutorial="tab-bar" className="flex items-center gap-0 overflow-x-auto">
      {paths.map((path) => {
        const fb = files.get(path);
        const isActive = path === activeFile;
        const name = filename(path);
        return (
          <button
            key={path}
            onClick={() => onSelect(path)}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 shrink-0 transition-colors ${
              isActive ? "text-zinc-200" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "opacity-80" : "opacity-40"} ${fileTypeDotColor(name)}`} />
            {fb?.dirty && <span className="text-amber-500/80 text-[8px]">●</span>}
            <span className="truncate max-w-[120px] text-[11px]">{name}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onClose(path); }}
              className="ml-0.5 text-[9px] text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
              role="button"
            >
              ✕
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-px bg-sky-500/50" />
            )}
          </button>
        );
      })}
    </div>
  );
}
