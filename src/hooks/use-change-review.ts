import { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileChange } from "../types/change-types";
import type { AiEvent } from "../types/ai-types";
import type { FsEvent } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

interface FsEventPayload { type: "Fs"; payload: FsEvent }
interface AiEventPayload { type: "Ai"; payload: AiEvent }

export interface TurnChanges {
  turnId: string;
  changes: FileChange[];
  accepted: boolean;
}

export function useChangeReview(sessionId: string | null) {
  const [turns, setTurns] = useState<TurnChanges[]>([]);
  const pendingChanges = useRef<FileChange[]>([]);
  const turnCounter = useRef(0);

  useTauriEvent<FsEventPayload>("fs:event", (event) => {
    if (event.payload.kind === "FileChangeDetected") {
      const { path, before, after } = event.payload;
      pendingChanges.current.push({
        path, before, after,
        change_type: before === null ? "created" : "modified",
      });
    }
  });

  useTauriEvent<AiEventPayload>("ai:event", (event) => {
    if (event.payload.kind !== "TurnComplete") return;
    if (sessionId && event.payload.session_id !== sessionId) return;
    if (pendingChanges.current.length === 0) return;

    const turnId = `turn-${++turnCounter.current}`;
    const changes = [...pendingChanges.current];
    pendingChanges.current = [];
    setTurns((prev) => [...prev, { turnId, changes, accepted: false }]);
  });

  const acceptTurn = useCallback((turnId: string) => {
    setTurns((prev) =>
      prev.map((t) => (t.turnId === turnId ? { ...t, accepted: true } : t)),
    );
  }, []);

  const revertTurn = useCallback(async (turnId: string) => {
    const turn = turns.find((t) => t.turnId === turnId);
    if (!turn) return;
    for (const change of turn.changes) {
      if (change.before !== null) {
        await invoke("write_file", { path: change.path, content: change.before });
      }
    }
    setTurns((prev) => prev.filter((t) => t.turnId !== turnId));
  }, [turns]);

  return { turns, acceptTurn, revertTurn };
}
