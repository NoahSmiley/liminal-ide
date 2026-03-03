import { useCallback } from "react";
import { CodeEditor } from "./code-editor";
import type { Extension } from "@codemirror/state";

interface FileEditorProps {
  path: string;
  buffer: string;
  dirty: boolean;
  saving: boolean;
  extensions?: Extension[];
  onClose: () => void;
  onBack: () => void;
  onChange: (content: string) => void;
  onSave: () => void;
}

export function FileEditor({ path, buffer, dirty, saving, extensions, onClose, onBack, onChange, onSave }: FileEditorProps) {
  const handleClose = useCallback(() => {
    if (dirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
    onClose();
  }, [dirty, onClose]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 text-[10px] text-zinc-500">
        <span className="truncate flex items-center gap-1">
          <button onClick={onBack} className="text-zinc-600 hover:text-zinc-300" title="back to chat (ctrl+e)">
            &larr;
          </button>
          {dirty && <span className="text-amber-500">●</span>}
          {path}
        </span>
        <div className="flex items-center gap-1">
          {dirty && (
            <button
              onClick={onSave}
              disabled={saving}
              className="text-zinc-400 hover:text-zinc-200 px-1 disabled:opacity-50"
            >
              {saving ? "…" : "save"}
            </button>
          )}
          <button onClick={handleClose} className="text-zinc-600 hover:text-zinc-300 px-1">
            x
          </button>
        </div>
      </div>
      <CodeEditor
        doc={buffer}
        path={path}
        extensions={extensions}
        onChange={onChange}
        onSave={onSave}
      />
    </div>
  );
}
