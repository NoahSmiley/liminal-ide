import { useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../../lib/codemirror/setup";
import { getLanguageLoader } from "../../lib/codemirror/languages";

const COMPACT_LINE_LIMIT = 15;

interface CodeBlockProps {
  code: string;
  filename?: string;
}

export function CodeBlock({ code, filename }: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const lines = useMemo(() => code.split("\n"), [code]);
  const lineCount = lines.length;
  const needsCompaction = lineCount > COMPACT_LINE_LIMIT;
  const isCompacted = needsCompaction && !expanded;
  const displayCode = isCompacted ? lines.slice(0, COMPACT_LINE_LIMIT).join("\n") : code;

  useEffect(() => {
    if (collapsed || !containerRef.current) return;

    const state = EditorState.create({
      doc: displayCode,
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
              doc: displayCode,
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
  }, [displayCode, filename, collapsed]);

  const headerLabel = filename ?? "code";
  const lineLabel = lineCount > 1 ? `${headerLabel} — ${lineCount} lines` : headerLabel;

  return (
    <div className="border border-zinc-800 my-2">
      <div
        className="flex items-center justify-between px-3 py-1 bg-zinc-950 text-[10px] text-zinc-500 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{lineLabel}</span>
        <span>{collapsed ? "+" : "-"}</span>
      </div>
      {!collapsed && (
        <div>
          <div ref={containerRef} className="overflow-x-auto" />
          {isCompacted && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full bg-zinc-950 text-[10px] text-zinc-500 hover:text-zinc-300 py-1 border-t border-zinc-800"
            >
              show all {lineCount} lines
            </button>
          )}
          {expanded && needsCompaction && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full bg-zinc-950 text-[10px] text-zinc-500 hover:text-zinc-300 py-1 border-t border-zinc-800"
            >
              collapse
            </button>
          )}
        </div>
      )}
    </div>
  );
}
