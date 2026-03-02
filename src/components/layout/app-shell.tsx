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

  const handleProjectCreated = useCallback(
    async (p: Project) => {
      setProject(p);
      const session = await invoke<{ id: string }>("create_session", {
        projectId: p.id,
      });
      setSessionId(session.id);
      refresh();
    },
    [refresh],
  );

  const handleCommand = useCallback(
    async (cmd: string, args: string) => {
      switch (cmd) {
        case "new": {
          const name = args || "untitled";
          const path = `${name}`;
          const p = await invoke<Project>("create_project", { name, path });
          await handleProjectCreated(p);
          break;
        }
        case "open": {
          if (!args) break;
          const p = await invoke<Project>("open_project", { path: args });
          await handleProjectCreated(p);
          break;
        }
        case "files":
          toggleFileTree();
          if (!panels.fileTreeOpen) refresh();
          break;
        case "terminal":
          toggleTerminal();
          break;
        default:
          addUserMessage(`unknown command: /${cmd}`);
      }
    },
    [handleProjectCreated, toggleFileTree, toggleTerminal, panels.fileTreeOpen, refresh, addUserMessage],
  );

  const handleInput = useCallback(
    async (input: string) => {
      if (input.startsWith("/")) {
        const [cmd = "", ...rest] = input.slice(1).split(" ");
        await handleCommand(cmd, rest.join(" "));
        return;
      }

      if (!sessionId) {
        addUserMessage("no project open -- use /new or /open first");
        return;
      }

      if (input.startsWith("!")) {
        if (!terminalId) {
          const id = await invoke<string>("spawn_terminal");
          setTerminalId(id);
          if (!panels.terminalOpen) toggleTerminal();
        }
        const cmd = input.slice(1) + "\n";
        if (terminalId) {
          await invoke("send_terminal_input", { terminalId, input: cmd });
        }
        return;
      }

      addUserMessage(input);
      await invoke("send_message", { sessionId, content: input }).catch(
        (err: unknown) => addUserMessage(`error: ${String(err)}`),
      );
    },
    [sessionId, terminalId, panels.terminalOpen, handleCommand, addUserMessage, toggleTerminal],
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
            {project ? (
              <ConversationStream messages={messages} streaming={streaming} />
            ) : (
              <p className="text-zinc-600 text-[12px]">
                no project open -- type /new or /open to start
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
