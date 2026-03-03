import type { Snippet } from "../../types/snippet-types";

interface SnippetCardProps {
  snippet: Snippet;
  onInsert: (content: string) => void;
  onRemove: (id: string) => void;
}

export function SnippetCard({ snippet, onInsert, onRemove }: SnippetCardProps) {
  return (
    <div className="border border-zinc-800/60 p-2 mb-1">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-zinc-400 font-bold">{snippet.title}</span>
        <span className="text-zinc-700">{snippet.language}</span>
      </div>
      <pre className="text-[9px] text-zinc-500 overflow-x-auto max-h-[60px] mb-1">
        {snippet.content.slice(0, 200)}
      </pre>
      <div className="flex items-center gap-2 text-[9px]">
        <button onClick={() => onInsert(snippet.content)} className="text-cyan-600 hover:text-cyan-400">
          insert
        </button>
        <button onClick={() => onRemove(snippet.id)} className="text-zinc-700 hover:text-red-400">
          remove
        </button>
      </div>
    </div>
  );
}
