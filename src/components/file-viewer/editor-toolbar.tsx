import { undo, redo } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";

interface EditorToolbarProps {
  view: EditorView | null;
  line: number;
  col: number;
  language: string;
}

function langLabel(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX",
    rs: "Rust", py: "Python", json: "JSON", md: "Markdown",
    html: "HTML", css: "CSS", toml: "TOML", yaml: "YAML",
  };
  return map[ext] ?? ext.toUpperCase();
}

export function EditorToolbar({ view, line, col, language }: EditorToolbarProps) {
  const handleUndo = () => { if (view) undo(view); };
  const handleRedo = () => { if (view) redo(view); };

  return (
    <div data-tutorial="editor-toolbar" className="flex items-center gap-2 px-2 py-0.5 border-t border-zinc-800/40 text-[10px] text-zinc-600">
      <button onClick={handleUndo} title="undo (⌘Z)" className="hover:text-zinc-400">undo</button>
      <button onClick={handleRedo} title="redo (⌘⇧Z)" className="hover:text-zinc-400">redo</button>
      <div className="flex-1" />
      <span>Ln {line}, Col {col}</span>
      <span className="text-zinc-700">|</span>
      <span>{langLabel(language)}</span>
    </div>
  );
}

export { langLabel };
