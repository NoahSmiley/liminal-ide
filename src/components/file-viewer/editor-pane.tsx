import { useCallback } from "react";
import { TabBar } from "./tab-bar";
import { CodeEditor } from "./code-editor";
import type { FileBuffer } from "../../hooks/use-open-files";
import type { Extension } from "@codemirror/state";

interface EditorPaneProps {
  files: Map<string, FileBuffer>;
  active: FileBuffer | null;
  activeFile: string | null;
  saving: boolean;
  extensions?: Extension[];
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
  onBack: () => void;
}

export function EditorPane({
  files, active, activeFile, saving, extensions, onSelect, onClose, onChange, onSave, onBack,
}: EditorPaneProps) {
  const handleChange = useCallback(
    (content: string) => { if (activeFile) onChange(activeFile, content); },
    [activeFile, onChange],
  );

  const handleSave = useCallback(
    () => { if (activeFile) onSave(activeFile); },
    [activeFile, onSave],
  );

  return (
    <div data-tutorial="editor-pane" className="flex flex-col h-full">
      <div className="flex items-center border-b border-zinc-800 text-[10px]">
        <button onClick={onBack} className="px-2 py-1 text-zinc-600 hover:text-zinc-300 shrink-0" title="back to chat (ctrl+e)">
          &larr;
        </button>
        <TabBar files={files} activeFile={activeFile} onSelect={onSelect} onClose={onClose} />
        <div className="flex-1" />
        {active?.dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 shrink-0"
          >
            {saving ? "..." : "save"}
          </button>
        )}
      </div>
      {active ? (
        <CodeEditor
          doc={active.buffer}
          path={active.path}
          extensions={extensions}
          onChange={handleChange}
          onSave={handleSave}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
          no file open
        </div>
      )}
    </div>
  );
}
