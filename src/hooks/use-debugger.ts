import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";
import type { DebugSession, StackFrame, Variable } from "../types/debug-types";

interface DebugEventPayload {
  type: "Debug";
  payload: { kind: string; reason?: string; thread_id?: number; exit_code?: number; frames?: StackFrame[]; variables?: Variable[] };
}

export function useDebugger() {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [loading, setLoading] = useState(false);

  useTauriEvent<DebugEventPayload>("debug:event", (event) => {
    const p = event.payload;
    setSession((prev) => {
      if (!prev) return prev;
      switch (p.kind) {
        case "Stopped":
          return { ...prev, state: { state: "Paused", reason: p.reason ?? "unknown" } };
        case "Continued":
          return { ...prev, state: { state: "Running" } };
        case "Exited":
          return { ...prev, state: { state: "Exited", code: p.exit_code ?? 0 } };
        case "StackFrames":
          return { ...prev, stack_frames: p.frames ?? [] };
        case "Variables":
          return { ...prev, variables: p.variables ?? [] };
        default:
          return prev;
      }
    });
  });

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
    setSession(null);
  }, []);

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
  }, []);

  const stepOver = useCallback(async () => {
    await invoke("debug_step_over");
  }, []);

  const stepInto = useCallback(async () => {
    await invoke("debug_step_into");
  }, []);

  const stepOut = useCallback(async () => {
    await invoke("debug_step_out");
  }, []);

  return {
    session, loading, refresh,
    start, stop,
    setBreakpoint, removeBreakpoint,
    continueExec, stepOver, stepInto, stepOut,
  };
}
