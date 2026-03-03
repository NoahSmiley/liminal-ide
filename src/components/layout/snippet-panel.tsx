import { useCallback, useState } from "react";
import { TuiPanel } from "../shared/tui-panel";
import { SnippetCard } from "./snippet-card";
import type { Snippet } from "../../types/snippet-types";

interface SnippetPanelProps {
  snippets: Snippet[];
  onAdd: (title: string, language: string, content: string) => void;
  onRemove: (id: string) => void;
  onInsert: (content: string) => void;
  onClose: () => void;
}

export function SnippetPanel({ snippets, onAdd, onRemove, onInsert, onClose }: SnippetPanelProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleAdd = useCallback(() => {
    if (!title.trim() || !content.trim()) return;
    onAdd(title.trim(), "text", content);
    setTitle("");
    setContent("");
    setAdding(false);
  }, [title, content, onAdd]);

  return (
    <TuiPanel
      title="snippets"
      className="mx-3 mb-2 max-h-[50vh] flex flex-col"
      dataTutorial="snippet-panel"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding(!adding)} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            {adding ? "cancel" : "+ new"}
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            esc
          </button>
        </div>
      }
    >
      {adding && (
        <div className="mb-2 flex flex-col gap-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] px-2 py-0.5 outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="snippet content..."
            rows={3}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] px-2 py-0.5 outline-none resize-none"
          />
          <button onClick={handleAdd} className="text-[10px] text-cyan-600 hover:text-cyan-400 self-end">
            save snippet
          </button>
        </div>
      )}
      <div className="overflow-y-auto flex-1 min-h-0">
        {snippets.length === 0 && !adding && (
          <div className="text-[10px] text-zinc-700">no snippets saved</div>
        )}
        {snippets.map((s) => (
          <SnippetCard key={s.id} snippet={s} onInsert={onInsert} onRemove={onRemove} />
        ))}
      </div>
    </TuiPanel>
  );
}
