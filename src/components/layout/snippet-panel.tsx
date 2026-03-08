import { useCallback, useRef, useState } from "react";
import { SnippetCard } from "./snippet-card";
import type { Snippet } from "../../types/snippet-types";

interface SnippetPanelProps {
  snippets: Snippet[];
  onAdd: (title: string, language: string, content: string) => void;
  onRemove: (id: string) => void;
  onInsert: (content: string) => void;
}

export function SnippetPanel({ snippets, onAdd, onRemove, onInsert }: SnippetPanelProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setAdding(true);
    setTimeout(() => titleRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    setAdding(false);
    setTitle("");
    setContent("");
  };

  const handleAdd = useCallback(() => {
    if (!title.trim() || !content.trim()) return;
    onAdd(title.trim(), "text", content);
    setTitle("");
    setContent("");
    setAdding(false);
  }, [title, content, onAdd]);

  return (
    <div className="flex flex-col h-full" data-tutorial="snippet-panel">
      {/* Toolbar */}
      <div className="flex items-center h-[30px] px-2 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] text-zinc-600 flex-1 select-none">
          {snippets.length} snippet{snippets.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={adding ? handleCancel : handleOpen}
          title={adding ? "cancel" : "new snippet"}
          className={`w-5 h-5 flex items-center justify-center rounded-[2px] text-[11px] transition-colors ${
            adding
              ? "text-zinc-500 hover:text-zinc-300"
              : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
          }`}
        >
          {adding ? "✕" : "+"}
        </button>
      </div>

      {/* New snippet form — inline, flush */}
      {adding && (
        <div className="border-b border-zinc-800/50 bg-zinc-950/40">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="w-full bg-transparent text-zinc-300 text-[11px] px-2 py-1.5 outline-none border-b border-zinc-800/40 placeholder:text-zinc-600 caret-cyan-400"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="snippet content..."
            rows={4}
            className="w-full bg-transparent text-zinc-400 text-[10px] px-2 py-1.5 outline-none resize-none placeholder:text-zinc-700 caret-cyan-400 font-mono leading-[1.5]"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
          />
          <div className="flex items-center justify-end px-2 py-1 border-t border-zinc-800/30 gap-2">
            <button
              onClick={handleCancel}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !content.trim()}
              className="text-[10px] text-cyan-600 hover:text-cyan-400 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors"
            >
              save
            </button>
          </div>
        </div>
      )}

      {/* Snippet list */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {snippets.length === 0 && !adding && (
          <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
            no snippets saved
          </div>
        )}
        {snippets.map((s) => (
          <SnippetCard key={s.id} snippet={s} onInsert={onInsert} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
