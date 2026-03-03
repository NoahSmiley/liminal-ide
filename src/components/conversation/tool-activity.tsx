import { useState } from "react";
import type { Message } from "../../types/session-types";
import type { FilePreview } from "../../hooks/use-ai-file-stream";
import type { FileChange } from "../../types/change-types";
import { InlinePreview } from "./inline-preview";
import { InlineDiff } from "./inline-diff";

interface ToolActivityProps {
  message: Message;
  preview?: FilePreview;
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

export function ToolActivity({ message, preview, fileChange, onOpenFile }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(true);
  const label = TOOL_LABELS[message.tool_name ?? ""] ?? "using";
  const isDone = message.content.endsWith("— done");
  const display = message.content.replace(" — done", "");
  const isFileTool = FILE_TOOLS.has(message.tool_name ?? "");

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 text-[11px]">
        <span className={isDone ? "text-emerald-600" : "text-amber-500"}>
          {isDone ? "◆" : "◇"}
        </span>
        <span className="text-zinc-500">
          {label}{" "}
          {isFileTool && onOpenFile ? (
            <button
              onClick={() => onOpenFile(display)}
              className="text-zinc-400 hover:text-cyan-400 underline underline-offset-2"
            >
              {display}
            </button>
          ) : (
            display
          )}
        </span>
        {isFileTool && (preview || fileChange) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-700 hover:text-zinc-400 text-[10px]"
          >
            {expanded ? "−" : "+"}
          </button>
        )}
      </div>
      {isFileTool && expanded && fileChange && (
        <InlineDiff path={fileChange.path} before={fileChange.before} after={fileChange.after} />
      )}
      {isFileTool && expanded && preview && !fileChange && (
        <InlinePreview preview={preview} />
      )}
    </div>
  );
}
