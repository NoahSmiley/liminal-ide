import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

interface CommandState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useTauriCommand<T>(command: string) {
  const [state, setState] = useState<CommandState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T | null> => {
      setState({ data: null, error: null, loading: true });
      try {
        const result = await invoke<T>(command, args);
        setState({ data: result, error: null, loading: false });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ data: null, error: message, loading: false });
        return null;
      }
    },
    [command],
  );

  return { ...state, execute };
}
