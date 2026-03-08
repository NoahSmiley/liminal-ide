import { useState } from "react";
import type { Message } from "../../types/session-types";
import type { FileChange } from "../../types/change-types";
import { InlineDiff } from "./inline-diff";

interface ToolActivityProps {
  message: Message;
  fileChange?: FileChange;
  onOpenFile?: (path: string) => void;
}

const TOOL_LABELS: Record<string, string> = {
  Write: "creating",
  create_file: "creating",
  Read: "reading",
  read_file: "reading",
  Edit: "editing",
  replace_in_file: "editing",
  MultiEdit: "editing",
  Bash: "running",
  execute_command: "running",
  Glob: "searching",
  Grep: "searching",
  LS: "listing",
  list_directory: "listing",
};

const FILE_TOOLS = new Set(["Write", "create_file", "Edit", "replace_in_file", "MultiEdit"]);

export function ToolActivity({ message, fileChange, onOpenFile }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(true);
  const label = TOOL_LABELS[message.tool_name ?? ""] ?? "using";
  const isDone = message.content.endsWith("— done");
  const display = message.content.replace(" — done", "");
  const isFileTool = FILE_TOOLS.has(message.tool_name ?? "");

  return (
    <div className="py-0.5 pl-1">
      <div className="flex items-center gap-2 text-[12px]">
        <span className={`text-[10px] ${isDone ? "text-sky-500/70" : "text-amber-500/80"}`}>
          {isDone ? "◆" : "◇"}
        </span>
        <span className="text-[10px]">
          <span className="text-zinc-600">{label}</span>{" "}
          {isFileTool && onOpenFile ? (
            <button
              onClick={() => onOpenFile(display)}
              className="text-zinc-400 hover:text-sky-400/80 underline underline-offset-2 decoration-zinc-700 hover:decoration-sky-400/30 transition-colors"
            >
              {display}
            </button>
          ) : (
            <span className="text-zinc-400">{display}</span>
          )}
        </span>
        {isFileTool && fileChange && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-700 hover:text-zinc-400 text-[11px] ml-auto transition-colors"
          >
            {expanded ? "collapse" : "diff"}
          </button>
        )}
      </div>
      {isFileTool && expanded && fileChange && (
        <InlineDiff path={fileChange.path} before={fileChange.before} after={fileChange.after} />
      )}
    </div>
  );
}
