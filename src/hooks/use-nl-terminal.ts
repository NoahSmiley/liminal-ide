import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface NlTerminalOpts {
  sessionId: string | null;
  addUserMessage: (content: string) => void;
  markPending: () => void;
}

/**
 * Translates natural language queries (prefixed with !!) into shell commands via AI.
 */
export function useNlTerminal({ sessionId, addUserMessage, markPending }: NlTerminalOpts) {
  const translate = useCallback(
    async (query: string) => {
      if (!sessionId) {
        addUserMessage("no project open -- use /new or /open first");
        return;
      }
      const prompt = [
        `Translate this to a shell command and run it: "${query}"`,
        "Use the Bash tool to execute the command.",
        "Show the command you chose before running it.",
      ].join(" ");

      addUserMessage(`!! ${query}`);
      markPending();
      await invoke("send_message", { sessionId, content: prompt }).catch(
        (err: unknown) => addUserMessage(`error: ${String(err)}`),
      );
    },
    [sessionId, addUserMessage, markPending],
  );

  return { translate };
}
