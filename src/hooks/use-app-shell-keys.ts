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
  toggleGit?: () => void;
  toggleDebug?: () => void;
  toggleTodos?: () => void;
  toggleSkillPalette?: () => void;
  toggleGuided?: () => void;
}

export function useAppShellKeys({
  streaming, toggleFileTree, toggleTerminal, toggleMainView, refresh,
  closeActiveFile, toggleSearch, toggleQuickSwitch, toggleGit, toggleDebug, toggleTodos, toggleSkillPalette, toggleGuided,
}: KeysOpts) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleFileTree(); refresh(); }
      if (e.key === "j" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleTerminal(); }
      if (e.key === "e" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggleMainView(); }
      if (e.key === "w" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); closeActiveFile?.(); }
      if (e.key === "k" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); toggleQuickSwitch?.(); }
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleSkillPalette?.(); }
      if (e.key === "F" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleSearch?.(); }
      if (e.key === "G" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleGit?.(); }
      if (e.key === "D" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleDebug?.(); }
      if (e.key === "T" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleTodos?.(); }
      if (e.key === "." && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); toggleGuided?.(); }
      if (e.key === "Escape" && streaming) { invoke("cancel_message").catch(() => {}); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [streaming, toggleFileTree, toggleTerminal, toggleMainView, refresh, closeActiveFile, toggleSearch, toggleQuickSwitch, toggleGit, toggleDebug, toggleTodos, toggleSkillPalette, toggleGuided]);
}
