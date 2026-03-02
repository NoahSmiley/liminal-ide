import { useCallback, useState } from "react";
import type { TerminalEvent } from "../types/terminal-types";
import { useTauriEvent } from "./use-tauri-event";

interface TerminalEventPayload {
  type: "Terminal";
  payload: TerminalEvent;
}

export function useTerminal(terminalId: string | null) {
  const [output, setOutput] = useState("");
  const [exited, setExited] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const handleTerminalEvent = useCallback(
    (event: TerminalEventPayload) => {
      const payload = event.payload;
      if (terminalId && payload.terminal_id !== terminalId) return;

      switch (payload.kind) {
        case "Output":
          setOutput((prev) => prev + payload.data);
          break;
        case "Exit":
          setExited(true);
          setExitCode(payload.code);
          break;
      }
    },
    [terminalId],
  );

  useTauriEvent("terminal:event", handleTerminalEvent);

  const clear = useCallback(() => {
    setOutput("");
    setExited(false);
    setExitCode(null);
  }, []);

  return { output, exited, exitCode, clear };
}
