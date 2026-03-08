import { useCallback } from "react";
import { TabBar } from "./tab-bar";
import { BreadcrumbBar } from "./breadcrumb-bar";
import { CodeEditor } from "./code-editor";
import { BreakpointGutter } from "../debugger/breakpoint-gutter";
import { CollabCursors } from "../layout/collab-cursors";
import type { FileBuffer } from "../../hooks/use-open-files";
import type { Extension } from "@codemirror/state";
import type { Breakpoint } from "../../types/debug-types";
import type { RemoteCursor } from "../../types/collab-types";

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
  breakpoints?: Breakpoint[];
  onToggleBreakpoint?: (path: string, line: number) => void;
  collabCursors?: RemoteCursor[];
  collabSendCursorUpdate?: (file: string, line: number, col: number) => void;
}

export function EditorPane({
  files, active, activeFile, saving, extensions, onSelect, onClose, onChange, onSave, onBack,
  breakpoints = [], onToggleBreakpoint, collabCursors = [], collabSendCursorUpdate: _collabSendCursorUpdate,
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
    <div data-tutorial="editor-pane" className="flex flex-col h-full min-h-0">
      <div className="flex items-center border-b border-border/40 bg-card/40 text-[11px]">
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
      <BreadcrumbBar path={activeFile} />
      {active ? (
        <div className="flex flex-1 min-h-0 relative">
          {onToggleBreakpoint && (
            <BreakpointGutter breakpoints={breakpoints} currentFile={activeFile}
              onToggle={onToggleBreakpoint} lineCount={active.buffer.split("\n").length} />
          )}
          <div className="flex-1 min-w-0 min-h-0 relative flex flex-col">
            <CollabCursors cursors={collabCursors} currentFile={activeFile} />
            <CodeEditor
              doc={active.buffer}
              path={active.path}
              extensions={extensions}
              onChange={handleChange}
              onSave={handleSave}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
          no file open
        </div>
      )}
    </div>
  );
}
