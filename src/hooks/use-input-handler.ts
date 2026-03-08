import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNlTerminal } from "./use-nl-terminal";

interface InputHandlerOpts {
  sessionId: string | null;
  terminalOpen: boolean;
  addUserMessage: (content: string) => void;
  markPending: () => void;
  handleCommand: (cmd: string, args: string) => Promise<void>;
  toggleTerminal: () => void;
  spawnTerminal: () => Promise<string | null>;
  sendTerminalInput: (id: string, input: string) => Promise<void>;
  activeTerminalId: string | null;
}

export function useInputHandler({
  sessionId, terminalOpen,
  addUserMessage, markPending, handleCommand, toggleTerminal,
  spawnTerminal, sendTerminalInput, activeTerminalId,
}: InputHandlerOpts) {
  const nl = useNlTerminal({ sessionId, addUserMessage, markPending });

  return useCallback(
    async (input: string) => {
      try {
        if (input.startsWith("/")) {
          const [cmd = "", ...rest] = input.slice(1).split(" ");
          await handleCommand(cmd, rest.join(" "));
          return;
        }
        if (!sessionId) {
          addUserMessage("no project open -- use /new or /open first");
          return;
        }
        // !! prefix: natural language to shell command
        if (input.startsWith("!!")) {
          const query = input.slice(2).trim();
          if (query) await nl.translate(query);
          return;
        }
        // ! prefix: direct terminal command
        if (input.startsWith("!")) {
          let tid = activeTerminalId;
          if (!tid) {
            tid = await spawnTerminal();
            if (!terminalOpen) toggleTerminal();
          }
          if (tid) await sendTerminalInput(tid, input.slice(1) + "\n");
          return;
        }
        // Resolve @mentions before sending
        let content = input;
        try {
          const result = await invoke<[string, unknown[]]>("resolve_mentions", { prompt: input });
          content = result[0];
        } catch { /* mention resolution failed, send raw */ }
        addUserMessage(input);
        markPending();
        await invoke("send_message", { sessionId, content }).catch(
          (err: unknown) => addUserMessage(`error: ${String(err)}`),
        );
      } catch (err) {
        addUserMessage(`error: ${String(err)}`);
      }
    },
    [sessionId, terminalOpen, addUserMessage, markPending, handleCommand, toggleTerminal, spawnTerminal, sendTerminalInput, activeTerminalId, nl],
  );
}
