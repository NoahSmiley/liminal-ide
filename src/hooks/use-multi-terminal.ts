import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";

interface TerminalState {
  id: string;
  output: string;
  exited: boolean;
  exitCode: number | null;
}

interface TerminalEventPayload {
  type: "Terminal";
  payload: { kind: "Output" | "Exit"; terminal_id: string; data?: string; code?: number };
}

export function useMultiTerminal() {
  const [terminals, setTerminals] = useState<Map<string, TerminalState>>(new Map());
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null);

  useTauriEvent<TerminalEventPayload>("terminal:event", (event) => {
    const { kind, terminal_id } = event.payload;
    setTerminals((prev) => {
      const t = prev.get(terminal_id);
      if (!t) return prev;
      const next = new Map(prev);
      if (kind === "Output" && event.payload.data) {
        next.set(terminal_id, { ...t, output: t.output + event.payload.data });
      } else if (kind === "Exit") {
        next.set(terminal_id, { ...t, exited: true, exitCode: event.payload.code ?? 0 });
      }
      return next;
    });
  });

  const spawn = useCallback(async () => {
    try {
      const id = await invoke<string>("spawn_terminal");
      const state: TerminalState = { id, output: "", exited: false, exitCode: null };
      setTerminals((prev) => new Map(prev).set(id, state));
      setActiveTerminal(id);
      return id;
    } catch (err) {
      console.error("Failed to spawn terminal:", err);
      return null;
    }
  }, []);

  const kill = useCallback(async (id: string) => {
    await invoke("kill_terminal", { terminalId: id }).catch(() => {});
    setTerminals((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActiveTerminal((prev) => {
      if (prev === id) {
        const remaining = Array.from(terminals.keys()).filter((k) => k !== id);
        return remaining[0] ?? null;
      }
      return prev;
    });
  }, [terminals]);

  const sendInput = useCallback(async (id: string, input: string) => {
    await invoke("send_terminal_input", { terminalId: id, input }).catch(() => {});
  }, []);

  const active = activeTerminal ? terminals.get(activeTerminal) ?? null : null;
  const terminalIds = Array.from(terminals.keys());

  return {
    terminals, active, activeTerminal, terminalIds,
    spawn, kill, sendInput, setActiveTerminal,
  };
}
