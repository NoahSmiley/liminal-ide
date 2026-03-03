import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface EditorContextSyncOpts {
  activeFile: string | null;
  cursorLine?: number;
  cursorCol?: number;
  selectedText?: string;
}

export function useEditorContextSync({
  activeFile, cursorLine, cursorCol, selectedText,
}: EditorContextSyncOpts) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      invoke("update_editor_context", {
        context: {
          active_file: activeFile,
          cursor_line: cursorLine ?? null,
          cursor_col: cursorCol ?? null,
          selected_text: selectedText ?? null,
        },
      }).catch(() => {});
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeFile, cursorLine, cursorCol, selectedText]);
}
