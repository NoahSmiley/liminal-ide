import type { GitStatus, StatusEntry } from "../../types/git-types";

interface GitStatusListProps {
  status: GitStatus;
  onSelectFile: (path: string) => void;
}

function Section({
  label,
  entries,
  color,
  onSelect,
}: {
  label: string;
  entries: StatusEntry[];
  color: string;
  onSelect: (path: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="mb-2">
      <div className={`text-[10px] uppercase tracking-wider mb-0.5 ${color}`}>
        {label} ({entries.length})
      </div>
      {entries.map((entry) => (
        <button
          key={entry.path}
          onClick={() => onSelect(entry.path)}
          className="block w-full text-left text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 px-2 py-0.5 truncate"
        >
          <span className="text-zinc-600 mr-1.5">{entry.status}</span>
          {entry.path}
        </button>
      ))}
    </div>
  );
}

export function GitStatusList({ status, onSelectFile }: GitStatusListProps) {
  return (
    <div className="overflow-y-auto">
      <Section label="staged" entries={status.staged} color="text-green-600" onSelect={onSelectFile} />
      <Section label="unstaged" entries={status.unstaged} color="text-amber-600" onSelect={onSelectFile} />
      <Section label="untracked" entries={status.untracked} color="text-zinc-600" onSelect={onSelectFile} />
      {status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0 && (
        <div className="text-[10px] text-zinc-600">working tree clean</div>
      )}
    </div>
  );
}
