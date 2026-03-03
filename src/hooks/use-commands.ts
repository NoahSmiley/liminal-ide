import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types/project-types";

interface CommandHandlers {
  setProject: (p: Project) => void;
  setSessionId: (id: string) => void;
  addUserMessage: (msg: string) => void;
  refresh: () => void;
  toggleFileTree: () => void;
  openFileTree: () => void;
  toggleTerminal: () => void;
  currentFilePath?: string | null;
  sessionId?: string | null;
  markPending?: () => void;
  onPanelCommand?: (cmd: string, args: string) => Promise<boolean>;
  toggleTutorial?: () => void;
}

export function useCommands(handlers: CommandHandlers) {
  const {
    setProject, setSessionId, addUserMessage, refresh,
    toggleFileTree, openFileTree, toggleTerminal,
    currentFilePath, sessionId, markPending, onPanelCommand, toggleTutorial,
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
          const session = await invoke<{ id: string }>("create_session", { projectId: p.id });
          setSessionId(session.id);
          addUserMessage(`project "${name}" created`);
          openFileTree();
          refresh();
          break;
        }
        case "open": {
          if (!args) { addUserMessage("usage: /open <path>"); break; }
          const p = await invoke<Project>("open_project", { path: args });
          setProject(p);
          const session = await invoke<{ id: string }>("create_session", { projectId: p.id });
          setSessionId(session.id);
          addUserMessage(`opened ${args}`);
          openFileTree();
          refresh();
          markPending?.();
          invoke("summarize_project", { sessionId: session.id }).catch(
            (err: unknown) => addUserMessage(`summary error: ${String(err)}`),
          );
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
    [setProject, setSessionId, addUserMessage, refresh, toggleFileTree, openFileTree, toggleTerminal, sendToAi, currentFilePath, onPanelCommand, toggleTutorial],
  );

  return handleCommand;
}

const HELP_TEXT = [
  "commands:",
  "  /new <name>    create a new project",
  "  /open <path>   open an existing project",
  "  /files         toggle file tree panel",
  "  /terminal      toggle terminal panel",
  "  /search        toggle search panel (⌘⇧F)",
  "  /git           toggle git panel",
  "  /todos         toggle TODO panel",
  "  /snippets      toggle snippet library",
  "  /plugins       toggle plugin panel",
  "  /debug         toggle debug panel",
  "  /share [url]   start collab session",
  "  /join <url> <room>  join collab session",
  "  /refresh       refresh file tree",
  "  /commit [msg]  commit changes",
  "  /diff          show git diff",
  "  /status        show git status",
  "  /pr [desc]     create pull request",
  "  /log           show git log",
  "  /review        AI code review",
  "  /summary       summarize project",
  "  /tutorial      interactive tutorial",
  "  /help          show this help",
  "",
  "  !<cmd>         run a shell command",
  "  !!<query>      natural language -> command",
  "  anything else  talk to the AI",
].join("\n");
