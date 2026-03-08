import { useState } from "react";
import type { Message } from "../../types/session-types";
import { ToolActivity } from "./tool-activity";

interface SubagentCardProps {
  description: string;
  toolName: string;
  messages: Message[];
  onOpenFile?: (path: string) => void;
}

export function SubagentCard({ description, toolName, messages, onOpenFile }: SubagentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const allDone = messages.every((m) => m.content.endsWith("— done"));
  const label = toolName === "Skill" ? "skill" : toolName === "Task" ? "task" : "subagent";

  return (
    <div className="mt-2 border border-border/30 rounded-[3px] bg-zinc-900/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className={`text-[10px] ${allDone ? "text-cyan-500/70" : "text-amber-500/80 animate-pulse"}`}>
          {allDone ? "✦" : "◇"}
        </span>
        <span className="text-[10px] text-zinc-600">{label}</span>
        <span className="text-[11px] text-zinc-400 truncate flex-1">{description}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ${
          allDone ? "bg-cyan-500/10 text-cyan-500/70" : "bg-amber-500/10 text-amber-500/70"
        }`}>
          {allDone ? "done" : "running"}
        </span>
        <span className="text-zinc-700 text-[10px]">{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded && messages.length > 0 && (
        <div className="border-t border-border/20 px-3 py-1">
          {messages.map((msg, i) => (
            <ToolActivity key={i} message={msg} onOpenFile={onOpenFile} />
          ))}
        </div>
      )}
    </div>
  );
}
