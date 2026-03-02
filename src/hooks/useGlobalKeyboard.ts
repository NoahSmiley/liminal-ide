import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

function isOverlayOpen() {
  const { commandPaletteOpen, shortcutHelpOpen, activeModal } =
    useUIStore.getState();
  return commandPaletteOpen || shortcutHelpOpen || activeModal !== null;
}

export function useGlobalKeyboard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K — always works (bypass guards)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
        return;
      }

      // Cmd+S — dispatch custom save event
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("liminal:save"));
        return;
      }

      // Cmd+= / Cmd+- / Cmd+0 — zoom
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        useUIStore.getState().zoomIn();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        useUIStore.getState().zoomOut();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        useUIStore.getState().zoomReset();
        return;
      }

      // Escape — close overlays
      if (e.key === "Escape") {
        const { shortcutHelpOpen, closeShortcutHelp } =
          useUIStore.getState();
        if (shortcutHelpOpen) {
          closeShortcutHelp();
          return;
        }
        return;
      }

      // All single-key shortcuts below require no input focus and no overlay
      if (isInputFocused() || isOverlayOpen()) return;

      // ? — toggle shortcut help
      if (e.key === "?") {
        e.preventDefault();
        useUIStore.getState().toggleShortcutHelp();
        return;
      }

      // : — focus terminal input (vim-style)
      if (e.key === ":") {
        e.preventDefault();
        const termInput = document.querySelector<HTMLInputElement>(
          '[data-slot="terminal-input"]',
        );
        if (termInput) termInput.focus();
        return;
      }

      // / — focus chat input
      if (e.key === "/") {
        e.preventDefault();
        const chatInput = document.querySelector<HTMLTextAreaElement>(
          '[data-slot="chat-input"]',
        );
        if (chatInput) chatInput.focus();
        return;
      }

      // t — cycle agent target (chat page)
      if (e.key === "t") {
        const isChatPage = location.pathname.includes("/chat");
        if (isChatPage) {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent("liminal:cycle-agent"));
        }
        return;
      }

      // n — context-aware new task/project
      if (e.key === "n") {
        e.preventDefault();
        const match = location.pathname.match(/\/project\/([^/]+)/);
        const projectId = match?.[1];
        const isBoardPage = location.pathname.endsWith("/board");
        if (projectId && isBoardPage) {
          useUIStore.getState().openModal("new-task");
        } else {
          useUIStore.getState().openModal("new-project");
        }
        return;
      }

      // 1-5 — navigate pages (only when in a project)
      const match = location.pathname.match(/\/project\/([^/]+)/);
      const projectId = match?.[1];
      if (projectId && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const routes = [
          `/project/${projectId}`,
          `/project/${projectId}/board`,
          `/project/${projectId}/agents`,
          `/project/${projectId}/chat`,
          `/project/${projectId}/settings`,
        ];
        const idx = parseInt(e.key) - 1;
        if (routes[idx]) navigate(routes[idx]);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [location.pathname, navigate]);
}
