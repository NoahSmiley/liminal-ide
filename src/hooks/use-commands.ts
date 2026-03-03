import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types/project-types";
import type { Message, Session } from "../types/session-types";
import { HELP_TEXT } from "../lib/help-text";

interface CommandHandlers {
  setProject: (p: Project) => void;
  setSessionId: (id: string) => void;
  setInitialMessages: (msgs: Message[]) => void;
  addUserMessage: (msg: string) => void;
  refresh: () => void;
  refreshProjects: () => void;
  toggleFileTree: () => void;
  openFileTree: () => void;
  toggleTerminal: () => void;
  currentFilePath?: string | null;
  sessionId?: string | null;
  projectId?: string | null;
  markPending?: () => void;
  onPanelCommand?: (cmd: string, args: string) => Promise<boolean>;
  toggleTutorial?: () => void;
}

export function useCommands(handlers: CommandHandlers) {
  const {
    setProject, setSessionId, setInitialMessages, addUserMessage, refresh, refreshProjects,
    toggleFileTree, openFileTree, toggleTerminal,
    currentFilePath, sessionId, projectId, markPending, onPanelCommand, toggleTutorial,
  } = handlers;

  const sendToAi = useCallback(
    async (prompt: string) => {
      if (!sessionId) { addUserMessage("no project open -- use /new or /open first"); return; }
      addUserMessage(prompt);
      markPending?.();
      await invoke("send_message", { sessionId, content: prompt }).catch(
        (err: unknown) => addUserMessage(`error: ${String(err)}`),
      );
    },
    [sessionId, addUserMessage, markPending],
  );

  const restoreSession = useCallback(
    async (project: Project) => {
      const session = await invoke<Session>("get_or_create_session", { projectId: project.id });
      setSessionId(session.id);
      setInitialMessages(session.messages ?? []);
      return session;
    },
    [setSessionId, setInitialMessages],
  );

  const handleCommand = useCallback(
    async (cmd: string, args: string) => {
      if (onPanelCommand) {
        const handled = await onPanelCommand(cmd, args);
        if (handled) return;
      }

      switch (cmd) {
        case "new": {
          const name = args || "untitled";
          const p = await invoke<Project>("create_project", { name, path: name });
          setProject(p);
          await restoreSession(p);
          addUserMessage(`project "${name}" created`);
          openFileTree();
          refresh();
          refreshProjects();
          break;
        }
        case "open": {
          if (!args) { addUserMessage("usage: /open <path>"); break; }
          const p = await invoke<Project>("open_project", { path: args });
          setProject(p);
          const session = await restoreSession(p);
          const isFresh = !session.messages || session.messages.length === 0;
          addUserMessage(isFresh ? `opened ${args}` : `resumed ${args}`);
          openFileTree();
          refresh();
          refreshProjects();
          if (isFresh) {
            markPending?.();
            invoke("summarize_project", { sessionId: session.id }).catch(
              (err: unknown) => addUserMessage(`summary error: ${String(err)}`),
            );
          }
          break;
        }
        case "switch": {
          if (!args) { addUserMessage("usage: /switch <project-id>"); break; }
          const p = await invoke<Project>("switch_project", { projectId: args });
          setProject(p);
          const session = await restoreSession(p);
          const isFresh = !session.messages || session.messages.length === 0;
          addUserMessage(isFresh ? `switched to ${p.name}` : `resumed ${p.name}`);
          openFileTree();
          refresh();
          break;
        }
        case "workspace": {
          if (!projectId) { addUserMessage("no project open"); break; }
          const ws = args.trim() || null;
          await invoke("update_project_workspace", { projectId, workspace: ws });
          addUserMessage(ws ? `workspace set to "${ws}"` : "workspace cleared");
          refreshProjects();
          break;
        }
        case "files": toggleFileTree(); refresh(); break;
        case "terminal": toggleTerminal(); break;
        case "refresh": refresh(); addUserMessage("refreshed"); break;
        case "commit":
          await sendToAi(args ? `Run: git add -A && git commit -m "${args}"` : "Review the current git changes, then create an appropriate commit with a descriptive message.");
          break;
        case "diff": await sendToAi("Run: git diff" + (args ? ` ${args}` : "")); break;
        case "status": await sendToAi("Run: git status"); break;
        case "pr": await sendToAi(args ? `Create a pull request: ${args}` : "Create a pull request for the current branch with a descriptive title and body."); break;
        case "log": await sendToAi("Run: git log --oneline -20" + (args ? ` ${args}` : "")); break;
        case "summary":
          if (!sessionId) { addUserMessage("no project open -- use /new or /open first"); break; }
          markPending?.();
          await invoke("summarize_project", { sessionId }).catch((err: unknown) => addUserMessage(`summary error: ${String(err)}`));
          break;
        case "review":
          if (currentFilePath) { await sendToAi(`Review the file at ${currentFilePath}. Look for bugs, security issues, performance problems, and code style. Be specific and reference line numbers.`); }
          else { await sendToAi("Review the recent code changes in this project. Look for bugs, security issues, performance problems, and code style. Be specific."); }
          break;
        case "tutorial": toggleTutorial?.(); break;
        case "help":
          addUserMessage(HELP_TEXT);
          break;
        default:
          addUserMessage(`unknown command: /${cmd}`);
      }
    },
    [setProject, setSessionId, addUserMessage, refresh, refreshProjects, toggleFileTree, openFileTree, toggleTerminal, sendToAi, currentFilePath, projectId, onPanelCommand, toggleTutorial, restoreSession],
  );

  return handleCommand;
}
