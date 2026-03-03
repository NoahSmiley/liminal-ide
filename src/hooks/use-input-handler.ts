import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNlTerminal } from "./use-nl-terminal";

interface InputHandlerOpts {
  sessionId: string | null;
  terminalId: string | null;
  terminalOpen: boolean;
  addUserMessage: (content: string) => void;
  markPending: () => void;
  handleCommand: (cmd: string, args: string) => Promise<void>;
  toggleTerminal: () => void;
  setTerminalId: (id: string | null) => void;
}

export function useInputHandler({
  sessionId, terminalId, terminalOpen,
  addUserMessage, markPending, handleCommand, toggleTerminal, setTerminalId,
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
          let tid = terminalId;
          if (!tid) {
            tid = await invoke<string>("spawn_terminal");
            setTerminalId(tid);
            if (!terminalOpen) toggleTerminal();
          }
          await invoke("send_terminal_input", { terminalId: tid, input: input.slice(1) + "\n" });
          return;
        }
        addUserMessage(input);
        markPending();
        await invoke("send_message", { sessionId, content: input }).catch(
          (err: unknown) => addUserMessage(`error: ${String(err)}`),
        );
      } catch (err) {
        addUserMessage(`error: ${String(err)}`);
      }
    },
    [sessionId, terminalId, terminalOpen, addUserMessage, markPending, handleCommand, toggleTerminal, setTerminalId, nl],
  );
}
