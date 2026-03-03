import { useCallback } from "react";

interface PanelCommandHandlers {
  toggleSearch: () => void;
  toggleGit: () => void;
  toggleTodos: () => void;
  toggleSnippets: () => void;
  togglePlugins: () => void;
  toggleDebug: () => void;
  addUserMessage: (msg: string) => void;
  collabCreate: (serverUrl: string) => Promise<string>;
  collabJoin: (serverUrl: string, roomId: string) => Promise<void>;
}

export function usePanelCommands(handlers: PanelCommandHandlers) {
  const {
    toggleSearch, toggleGit, toggleTodos, toggleSnippets,
    togglePlugins, toggleDebug, addUserMessage,
    collabCreate, collabJoin,
  } = handlers;

  const handlePanelCommand = useCallback(
    async (cmd: string, args: string): Promise<boolean> => {
      switch (cmd) {
        case "search":
          toggleSearch();
          return true;
        case "git":
          toggleGit();
          return true;
        case "todos":
          toggleTodos();
          return true;
        case "snippets":
          toggleSnippets();
          return true;
        case "plugins":
          togglePlugins();
          return true;
        case "debug":
          toggleDebug();
          return true;
        case "share": {
          const serverUrl = args || "ws://localhost:8080";
          try {
            const roomId = await collabCreate(serverUrl);
            addUserMessage(`shared session: ${roomId}`);
          } catch (err) {
            addUserMessage(`share failed: ${String(err)}`);
          }
          return true;
        }
        case "join": {
          const parts = args.split(" ");
          const serverUrl = parts[0];
          const roomId = parts[1];
          if (!serverUrl || !roomId) {
            addUserMessage("usage: /join <server-url> <room-id>");
            return true;
          }
          try {
            await collabJoin(serverUrl, roomId);
            addUserMessage(`joined room ${roomId}`);
          } catch (err) {
            addUserMessage(`join failed: ${String(err)}`);
          }
          return true;
        }
        default:
          return false;
      }
    },
    [toggleSearch, toggleGit, toggleTodos, toggleSnippets, togglePlugins, toggleDebug, addUserMessage, collabCreate, collabJoin],
  );

  return handlePanelCommand;
}
