import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DebugSession } from "../types/debug-types";

export function useDebugger() {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<DebugSession>("debug_get_session");
      setSession(result);
    } catch (err) {
      console.error("Debug refresh failed:", err);
    }
  }, []);

  const start = useCallback(async (adapter: string, program: string) => {
    setLoading(true);
    try {
      await invoke("debug_start", { adapter, program });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const stop = useCallback(async () => {
    await invoke("debug_stop");
    await refresh();
  }, [refresh]);

  const setBreakpoint = useCallback(async (path: string, line: number) => {
    await invoke("debug_set_breakpoint", { path, line });
    await refresh();
  }, [refresh]);

  const removeBreakpoint = useCallback(async (path: string, line: number) => {
    await invoke("debug_remove_breakpoint", { path, line });
    await refresh();
  }, [refresh]);

  const continueExec = useCallback(async () => {
    await invoke("debug_continue");
    await refresh();
  }, [refresh]);

  const stepOver = useCallback(async () => {
    await invoke("debug_step_over");
    await refresh();
  }, [refresh]);

  const stepInto = useCallback(async () => {
    await invoke("debug_step_into");
    await refresh();
  }, [refresh]);

  const stepOut = useCallback(async () => {
    await invoke("debug_step_out");
    await refresh();
  }, [refresh]);

  return {
    session, loading, refresh,
    start, stop,
    setBreakpoint, removeBreakpoint,
    continueExec, stepOver, stepInto, stepOut,
  };
}
