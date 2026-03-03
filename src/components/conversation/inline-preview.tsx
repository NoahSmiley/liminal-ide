import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../../lib/codemirror/setup";
import { getLanguageLoader } from "../../lib/codemirror/languages";
import type { FilePreview } from "../../hooks/use-ai-file-stream";

const previewTheme = EditorView.theme({
  "&": { fontSize: "11px" },
  ".cm-scroller": { overflow: "hidden !important" },
  ".cm-gutters": { display: "none" },
  ".cm-content": { padding: "4px 0" },
});

interface InlinePreviewProps {
  preview: FilePreview;
}

export function InlinePreview({ preview }: InlinePreviewProps) {
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
        previewTheme,
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
    <div className="mt-1 ml-6 border border-zinc-800 overflow-hidden">
      {!preview.done && (
        <div className="flex items-center px-2 py-0.5 text-[9px] text-cyan-400 bg-zinc-950 border-b border-zinc-800">
          <span className="animate-pulse">writing...</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
