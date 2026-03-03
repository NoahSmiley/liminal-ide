import { useCallback, useState } from "react";
import type { LintEvent } from "../types/lint-types";
import { useTauriEvent } from "./use-tauri-event";

interface LintEventPayload {
  type: "Lint";
  payload: LintEvent;
}

interface LintState {
  running: boolean;
  result: { success: boolean; output: string; command: string } | null;
}

export function useLint() {
  const [state, setState] = useState<LintState>({ running: false, result: null });

  useTauriEvent<LintEventPayload>("lint:event", (event) => {
    switch (event.payload.kind) {
      case "Started":
        setState({ running: true, result: null });
        break;
      case "Complete":
        setState({
          running: false,
          result: {
            success: event.payload.success,
            output: event.payload.output,
            command: event.payload.command,
          },
        });
        break;
    }
  });

  const dismiss = useCallback(() => {
    setState({ running: false, result: null });
  }, []);

  return { ...state, dismiss };
}
