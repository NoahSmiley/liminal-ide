import type { DirEntry } from "../../types/fs-types";

interface FileTreeProps {
  entries: DirEntry[];
  onSelect: (entry: DirEntry) => void;
}

export function FileTree({ entries, onSelect }: FileTreeProps) {
  return (
    <div className="text-[12px]">
      {entries.map((entry) => (
        <div
          key={entry.path}
          className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-zinc-900"
          onClick={() => onSelect(entry)}
        >
          <span className="text-zinc-600 w-3">
            {entry.is_dir ? "+" : " "}
          </span>
          <span className={entry.is_dir ? "text-cyan-400" : "text-zinc-400"}>
            {entry.name}
          </span>
        </div>
      ))}
    </div>
  );
}
