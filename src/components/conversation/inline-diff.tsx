import { useState } from "react";
import { computeLineDiff, type DiffLine } from "../../lib/line-diff";

interface InlineDiffProps {
  path: string;
  before: string | null;
  after: string;
}

const LINE_COLORS: Record<DiffLine["type"], string> = {
  added: "bg-sky-950/40 text-sky-300",
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
    <div className="mt-1 border border-panel-border/60 rounded-[2px] text-[11px]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-900/30 transition-colors"
      >
        <span className="text-zinc-600 text-[10px]">{expanded ? "▾" : "▸"}</span>
        <span className="text-zinc-400 truncate flex-1">{path}</span>
        <span className="text-zinc-600">
          {isNew ? "new file" : `${changedCount} lines`}
        </span>
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-border/40 bg-card/30">
          {lines.map((line, i) => (
            <div key={i} className={`px-3 font-mono leading-relaxed ${LINE_COLORS[line.type]}`}>
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
