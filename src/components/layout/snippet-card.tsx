import { useState } from "react";
import type { Snippet } from "../../types/snippet-types";

interface SnippetCardProps {
  snippet: Snippet;
  onInsert: (content: string) => void;
  onRemove: (id: string) => void;
}

export function SnippetCard({ snippet, onInsert, onRemove }: SnippetCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-zinc-800/40 last:border-b-0">
      {/* Title row */}
      <div className="flex items-center h-[22px] px-2 hover:bg-white/[0.04] group">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center flex-1 min-w-0 text-left h-full"
        >
          <span className="text-[10px] text-zinc-500 mr-1.5 w-2.5 shrink-0">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="text-[10px] text-zinc-300 truncate">{snippet.title}</span>
          {snippet.language && snippet.language !== "text" && (
            <span className="text-[9px] text-zinc-600 ml-1.5 shrink-0">{snippet.language}</span>
          )}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onInsert(snippet.content)}
            title="insert"
            className="text-[9px] text-cyan-600 hover:text-cyan-400 transition-colors px-1"
          >
            insert
          </button>
          <button
            onClick={() => onRemove(snippet.id)}
            title="remove"
            className="text-[9px] text-zinc-700 hover:text-red-400 transition-colors px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <pre className="text-[10px] text-zinc-500 leading-[1.5] px-4 py-1.5 overflow-x-auto bg-zinc-950/40 border-t border-zinc-800/30 max-h-[120px]">
          {snippet.content.slice(0, 400)}
          {snippet.content.length > 400 && (
            <span className="text-zinc-700">…</span>
          )}
        </pre>
      )}
    </div>
  );
}
