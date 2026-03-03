import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface KeysOpts {
  streaming: boolean;
  toggleFileTree: () => void;
  toggleTerminal: () => void;
  toggleMainView: () => void;
  refresh: () => void;
  closeActiveFile?: () => void;
  toggleSearch?: () => void;
  toggleQuickSwitch?: () => void;
}

export function useAppShellKeys({
  streaming, toggleFileTree, toggleTerminal, toggleMainView, refresh,
  closeActiveFile, toggleSearch, toggleQuickSwitch,
}: KeysOpts) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleFileTree(); refresh(); }
      if (e.key === "j" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleTerminal(); }
      if (e.key === "e" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleMainView(); }
      if (e.key === "w" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); closeActiveFile?.(); }
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleQuickSwitch?.(); }
      if (e.key === "F" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleSearch?.(); }
      if (e.key === "Escape" && streaming) { invoke("cancel_message").catch(() => {}); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [streaming, toggleFileTree, toggleTerminal, toggleMainView, refresh, closeActiveFile, toggleSearch, toggleQuickSwitch]);
}
