import { useCallback } from "react";
import type { TreeNode } from "../types/fs-types";
import type { TodoItem } from "../types/todo-types";
import type { StackFrame } from "../types/debug-types";
import type { MainView } from "../stores/ui-store";

interface UiActions { setMainView: (view: MainView) => void }
interface FileContext {
  openFile: (path: string) => void;
  activeFile: string | null;
  closeFile: (path: string) => void;
}

export function useAppShellActions(fc: FileContext, ui: UiActions, handleInput: (input: string) => void) {
  const openFileInEditor = useCallback(
    (path: string) => { fc.openFile(path); ui.setMainView("editor"); },
    [fc, ui],
  );
  const openFileAt = useCallback(
    (path: string, _line: number) => openFileInEditor(path),
    [openFileInEditor],
  );
  const handleFileSelect = useCallback(
    (node: TreeNode) => { if (!node.is_dir) openFileInEditor(node.path); },
    [openFileInEditor],
  );
  const handleFixTodo = useCallback(
    (item: TodoItem) => { handleInput(`fix the ${item.kind} at ${item.path}:${item.line_number}: ${item.text}`); },
    [handleInput],
  );
  const handleSelectDebugFrame = useCallback(
    (frame: StackFrame) => { if (frame.source_path) openFileAt(frame.source_path, frame.line); },
    [openFileAt],
  );
  const closeActiveFile = useCallback(
    () => { if (fc.activeFile) fc.closeFile(fc.activeFile); },
    [fc],
  );

  return { openFileInEditor, openFileAt, handleFileSelect, handleFixTodo, handleSelectDebugFrame, closeActiveFile };
}
