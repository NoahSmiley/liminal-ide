import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../../lib/codemirror/setup";
import { getLanguageLoader } from "../../lib/codemirror/languages";
import type { FilePreview } from "../../hooks/use-ai-file-stream";

const panelTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "11px" },
  ".cm-scroller": { overflow: "auto !important" },
  ".cm-content": { padding: "4px 0" },
});

interface FilePreviewPanelProps {
  preview: FilePreview;
}

function extractFilename(path: string): string {
  const sep = path.includes("\\") ? "\\" : "/";
  return path.split(sep).pop() ?? path;
}

export function FilePreviewPanel({ preview }: FilePreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;
    const lComp = langComp.current = new Compartment();

    const state = EditorState.create({
      doc: preview.visibleContent,
      extensions: [
        ...baseExtensions(),
        panelTheme,
        lComp.of([]),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    const loader = getLanguageLoader(preview.path);
    if (loader) {
      loader().then((lang) => {
        if (viewRef.current === view) {
          view.dispatch({ effects: lComp.reconfigure(lang) });
        }
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.path]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === preview.visibleContent) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: preview.visibleContent },
    });
  }, [preview.visibleContent]);

  return (
    <div className="flex flex-col h-full border-l border-zinc-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-950 text-[10px]">
        <span className="text-zinc-400 truncate">{extractFilename(preview.path)}</span>
        {!preview.done && <span className="text-cyan-400 animate-pulse">writing...</span>}
      </div>
      <div className="px-3 py-0.5 text-[9px] text-zinc-600 truncate border-b border-zinc-800/40 bg-zinc-950">
        {preview.path}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
}
