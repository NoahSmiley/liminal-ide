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

  return (
    <div className="border border-panel-border/80 rounded-[3px] shadow-md shadow-black/40 overflow-hidden my-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-card/80 border-b border-border/50 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="flex items-center gap-2 text-[11px] text-zinc-400 tracking-wide">
          <span className="text-zinc-600">◆</span>
          {headerLabel}
          {lineCount > 1 && <span className="text-zinc-600">— {lineCount} lines</span>}
        </span>
        <span className="text-zinc-600 text-[11px]">{collapsed ? "diff" : "collapse"}</span>
      </div>
      {!collapsed && (
        <div className="bg-card/50">
          <div ref={containerRef} className="overflow-x-auto" />
          {isCompacted && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 py-1.5 border-t border-border/50 transition-colors"
            >
              +{lineCount - COMPACT_LINE_LIMIT} lines
            </button>
          )}
          {expanded && needsCompaction && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 py-1.5 border-t border-border/50 transition-colors"
            >
              collapse
            </button>
          )}
        </div>
      )}
    </div>
  );
}
