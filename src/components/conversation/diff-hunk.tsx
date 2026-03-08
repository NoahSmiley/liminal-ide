import type { DiffHunk as DiffHunkType, DiffLine } from "../../types/diff-types";

interface DiffHunkProps {
  hunk: DiffHunkType;
}

function lineColor(tag: DiffLine["tag"]): string {
  switch (tag) {
    case "insert": return "bg-sky-950/30 text-sky-400";
    case "delete": return "bg-red-950/30 text-red-400";
    default: return "text-zinc-500";
  }
}

function linePrefix(tag: DiffLine["tag"]): string {
  switch (tag) {
    case "insert": return "+";
    case "delete": return "-";
    default: return " ";
  }
}

export function DiffHunk({ hunk }: DiffHunkProps) {
  return (
    <div className="font-mono text-[10px] leading-tight">
      <div className="text-zinc-600 px-2 py-0.5">
        @@ -{hunk.old_start} +{hunk.new_start} @@
      </div>
      {hunk.lines.map((line, i) => (
        <div key={i} className={`px-2 ${lineColor(line.tag)}`}>
          <span className="inline-block w-3 text-right mr-1 opacity-50">
            {linePrefix(line.tag)}
          </span>
          {line.content.trimEnd()}
        </div>
      ))}
    </div>
  );
}
