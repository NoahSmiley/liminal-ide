import { useState } from "react";
import { computeLineDiff, type DiffLine } from "../../lib/line-diff";

interface InlineDiffProps {
  path: string;
  before: string | null;
  after: string;
}

const LINE_COLORS: Record<DiffLine["type"], string> = {
  added: "bg-emerald-950/40 text-emerald-300",
  removed: "bg-red-950/40 text-red-400 line-through",
  unchanged: "text-zinc-500",
};

const PREFIX: Record<DiffLine["type"], string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
};

export function InlineDiff({ path, before, after }: InlineDiffProps) {
  const [expanded, setExpanded] = useState(false);
  const isNew = before === null;
  const lines = computeLineDiff(before ?? "", after);
  const changedCount = lines.filter((l) => l.type !== "unchanged").length;

  return (
    <div className="mt-1 border border-zinc-800/40 rounded text-[11px]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-zinc-900/50"
      >
        <span className="text-zinc-600">{expanded ? "v" : ">"}</span>
        <span className="text-zinc-400 truncate flex-1">{path}</span>
        <span className="text-zinc-600">
          {isNew ? "new file" : `${changedCount} lines changed`}
        </span>
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-zinc-800/40">
          {lines.map((line, i) => (
            <div key={i} className={`px-2 font-mono ${LINE_COLORS[line.type]}`}>
              <span className="inline-block w-4 text-zinc-700 select-none">
                {PREFIX[line.type]}
              </span>
              {line.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
