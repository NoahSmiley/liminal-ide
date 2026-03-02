import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../../types/project-types";
import { StatusBar } from "./status-bar";
import { InputBar } from "./input-bar";
import { ConversationStream } from "../conversation/conversation-stream";
import { FileTree } from "../file-viewer/file-tree";
import { TerminalPanel } from "../terminal-output/terminal-panel";
import { TuiPanel } from "../shared/tui-panel";
import { useConversation } from "../../hooks/use-conversation";
import { useFileTree } from "../../hooks/use-file-tree";
import { useTerminal } from "../../hooks/use-terminal";
import { useUiStore } from "../../stores/ui-store";

export function AppShell() {
  const [project, setProject] = useState<Project | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [claudeAvailable, setClaudeAvailable] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  const { messages, streaming, addUserMessage } = useConversation(sessionId);
  const { entries, refresh } = useFileTree();
  const terminal = useTerminal(terminalId);
  const panels = useUiStore((s) => s.panels);
  const toggleFileTree = useUiStore((s) => s.toggleFileTree);
  const toggleTerminal = useUiStore((s) => s.toggleTerminal);

  useEffect(() => {
    invoke<boolean>("check_claude_status")
      .then(setClaudeAvailable)
      .catch(() => setClaudeAvailable(false));
  }, []);

  const handleInput = useCallback(
    async (input: string) => {
      try {
        if (input.startsWith("/")) {
          const [cmd = "", ...rest] = input.slice(1).split(" ");
          const args = rest.join(" ");

          switch (cmd) {
            case "new": {
              const name = args || "untitled";
              const p = await invoke<Project>("create_project", {
                name,
                path: name,
              });
              setProject(p);
              const session = await invoke<{ id: string }>(
                "create_session",
                { projectId: p.id },
              );
              setSessionId(session.id);
              addUserMessage(`project "${name}" created`);
              refresh();
              break;
            }
            case "open": {
              if (!args) {
                addUserMessage("usage: /open <path>");
                break;
              }
              const p = await invoke<Project>("open_project", { path: args });
              setProject(p);
              const session = await invoke<{ id: string }>(
                "create_session",
                { projectId: p.id },
              );
              setSessionId(session.id);
              addUserMessage(`opened ${args}`);
              refresh();
              break;
            }
            case "files":
              toggleFileTree();
              refresh();
              break;
            case "terminal":
              toggleTerminal();
              break;
            case "refresh":
              refresh();
              addUserMessage("refreshed");
              break;
            case "help":
              addUserMessage(
                [
                  "commands:",
                  "  /new <name>    create a new project",
                  "  /open <path>   open an existing project",
                  "  /files         toggle file tree panel",
                  "  /terminal      toggle terminal panel",
                  "  /refresh       refresh file tree",
                  "  /help          show this help",
                  "",
                  "  !<cmd>         run a shell command",
                  "  anything else  talk to the AI",
                ].join("\n"),
              );
              break;
            default:
              addUserMessage(`unknown command: /${cmd}`);
          }
          return;
        }

        if (!sessionId) {
          addUserMessage("no project open — use /new or /open first");
          return;
        }

        if (input.startsWith("!")) {
          let tid = terminalId;
          if (!tid) {
            tid = await invoke<string>("spawn_terminal");
            setTerminalId(tid);
            if (!panels.terminalOpen) toggleTerminal();
          }
          await invoke("send_terminal_input", {
            terminalId: tid,
            input: input.slice(1) + "\n",
          });
          return;
        }

        addUserMessage(input);
        await invoke("send_message", { sessionId, content: input }).catch(
          (err: unknown) => addUserMessage(`error: ${String(err)}`),
        );
      } catch (err) {
        addUserMessage(`error: ${String(err)}`);
      }
    },
    [sessionId, terminalId, panels.terminalOpen, addUserMessage, refresh, toggleFileTree, toggleTerminal],
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 font-mono text-[13px]">
      <StatusBar
        projectName={project?.name ?? null}
        claudeAvailable={claudeAvailable}
      />
      <div className="flex flex-1 overflow-hidden">
        {panels.fileTreeOpen && (
          <aside className="w-56 border-r border-zinc-800 overflow-y-auto p-2">
            <TuiPanel title="files">
              <FileTree entries={entries} onSelect={() => {}} />
            </TuiPanel>
          </aside>
        )}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length > 0 ? (
              <ConversationStream messages={messages} streaming={streaming} />
            ) : (
              <p className="text-zinc-600 text-[12px]">
                {project
                  ? "start a conversation — type below"
                  : "no project open — type /new <name> or /open <path> to start"}
              </p>
            )}
          </div>
          {panels.terminalOpen && (
            <div className="border-t border-zinc-800 p-2">
              <TuiPanel title="terminal">
                <TerminalPanel
                  output={terminal.output}
                  exited={terminal.exited}
                  exitCode={terminal.exitCode}
                />
              </TuiPanel>
            </div>
          )}
        </main>
      </div>
      <InputBar onSubmit={handleInput} disabled={streaming} />
    </div>
  );
}
