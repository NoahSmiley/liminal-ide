import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../../lib/codemirror/setup";
import { getLanguageLoader } from "../../lib/codemirror/languages";

interface CodeBlockProps {
  code: string;
  filename?: string;
}

export function CodeBlock({ code, filename }: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (collapsed || !containerRef.current) return;

    const state = EditorState.create({
      doc: code,
      extensions: [...baseExtensions(), EditorState.readOnly.of(true), EditorView.editable.of(false)],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    if (filename) {
      const loader = getLanguageLoader(filename);
      if (loader) {
        loader().then((lang) => {
          if (viewRef.current === view) {
            view.setState(EditorState.create({
              doc: code,
              extensions: [...baseExtensions(), lang, EditorState.readOnly.of(true), EditorView.editable.of(false)],
            }));
          }
        });
      }
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [code, filename, collapsed]);

  return (
    <div className="border border-zinc-800 my-2">
      <div
        className="flex items-center justify-between px-3 py-1 bg-zinc-950 text-[10px] text-zinc-500 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{filename ?? "code"}</span>
        <span>{collapsed ? "+" : "-"}</span>
      </div>
      {!collapsed && <div ref={containerRef} className="overflow-x-auto" />}
    </div>
  );
}
