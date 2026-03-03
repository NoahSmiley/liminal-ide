import { useState } from "react";
import type { Message } from "../../types/session-types";
import { ToolActivity } from "./tool-activity";

interface ToolActivityGroupProps {
  messages: Message[];
  onOpenFile?: (path: string) => void;
}

const CATEGORY: Record<string, string> = {
  Write: "created", create_file: "created",
  Read: "read", read_file: "read",
  Edit: "edited", replace_in_file: "edited", MultiEdit: "edited",
  Bash: "ran", execute_command: "ran",
  Glob: "searched", Grep: "searched",
  LS: "listed", list_directory: "listed",
};

const UNIT: Record<string, [string, string]> = {
  created: ["file", "files"],
  read: ["file", "files"],
  edited: ["file", "files"],
  ran: ["command", "commands"],
  searched: ["search", "searches"],
  listed: ["directory", "directories"],
};

function buildSummary(messages: Message[]): string {
  const counts = new Map<string, number>();
  for (const msg of messages) {
    const cat = CATEGORY[msg.tool_name ?? ""] ?? "used";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  const parts: string[] = [];
  for (const [cat, count] of counts) {
    const [singular, plural] = UNIT[cat] ?? ["tool", "tools"];
    parts.push(`${cat} ${count} ${count === 1 ? singular : plural}`);
  }
  return parts.join(", ");
}

export function ToolActivityGroup({ messages, onOpenFile }: ToolActivityGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const allDone = messages.every((m) => m.content.endsWith("— done"));

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[12px] hover:text-zinc-400 transition-colors"
      >
        <span className={allDone ? "text-emerald-600" : "text-amber-500"}>
          {allDone ? "◆" : "◇"}
        </span>
        <span className="text-zinc-500">{buildSummary(messages)}</span>
        <span className="text-zinc-700 text-[11px]">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="ml-4 mt-0.5">
          {messages.map((msg, i) => (
            <ToolActivity key={i} message={msg} onOpenFile={onOpenFile} />
          ))}
        </div>
      )}
    </div>
  );
}
