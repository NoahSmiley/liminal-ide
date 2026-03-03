import { useEffect, useRef } from "react";
import { EditorState, Annotation, Compartment, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { baseExtensions } from "../../lib/codemirror/setup";
import { getLanguageLoader } from "../../lib/codemirror/languages";

const externalUpdate = Annotation.define<boolean>();

interface CodeEditorProps {
  doc: string;
  path: string;
  readOnly?: boolean;
  extensions?: Extension[];
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export function CodeEditor({ doc, path, readOnly, extensions: extra, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyComp = useRef(new Compartment());
  const langComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  // Mount / unmount editor when path changes
  useEffect(() => {
    if (!containerRef.current) return;

    const roComp = readOnlyComp.current = new Compartment();
    const lComp = langComp.current = new Compartment();

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (update.transactions.some((tr) => tr.annotation(externalUpdate))) return;
      onChangeRef.current?.(update.state.doc.toString());
    });

    const saveHandler = EditorView.domEventHandlers({
      keydown(event) {
        if (event.key === "s" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSaveRef.current?.();
          return true;
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc,
      extensions: [
        ...baseExtensions(),
        lComp.of([]),
        roComp.of(EditorState.readOnly.of(readOnly ?? false)),
        updateListener,
        saveHandler,
        ...(extra ?? []),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    const loader = getLanguageLoader(path);
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
  }, [path]);

  // Sync external doc changes (AI animation, file reload)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === doc) return;

    view.dispatch({
      changes: { from: 0, to: current.length, insert: doc },
      annotations: externalUpdate.of(true),
    });
  }, [doc]);

  // Sync readOnly via compartment reconfigure
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: readOnlyComp.current.reconfigure(EditorState.readOnly.of(readOnly ?? false)) });
  }, [readOnly]);

  // Auto-scroll to bottom during AI streaming
  useEffect(() => {
    if (!readOnly) return;
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length) });
  }, [doc, readOnly]);

  return <div ref={containerRef} data-tutorial="code-editor" className="flex-1 min-h-0 overflow-hidden" />;
}
