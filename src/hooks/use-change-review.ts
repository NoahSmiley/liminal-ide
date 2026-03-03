import { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileChange, FileReviewStatus } from "../types/change-types";
import type { AiEvent } from "../types/ai-types";
import type { FsEvent } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

interface FsEventPayload { type: "Fs"; payload: FsEvent }
interface AiEventPayload { type: "Ai"; payload: AiEvent }

export interface TurnChanges {
  turnId: string;
  changes: FileChange[];
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
        status: "pending",
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
    setTurns((prev) => [...prev, { turnId, changes }]);
  });

  const updateFileStatus = useCallback(
    (turnId: string, path: string, status: FileReviewStatus) => {
      setTurns((prev) =>
        prev.map((t) =>
          t.turnId === turnId
            ? { ...t, changes: t.changes.map((c) => (c.path === path ? { ...c, status } : c)) }
            : t,
        ),
      );
    },
    [],
  );

  const acceptFile = useCallback(
    (turnId: string, path: string) => updateFileStatus(turnId, path, "accepted"),
    [updateFileStatus],
  );

  const rejectFile = useCallback(
    (turnId: string, path: string) => {
      setTurns((prev) => {
        const turn = prev.find((t) => t.turnId === turnId);
        const change = turn?.changes.find((c) => c.path === path);
        if (change?.before !== null && change?.before !== undefined) {
          invoke("write_file", { path: change.path, content: change.before });
        }
        return prev.map((t) =>
          t.turnId === turnId
            ? { ...t, changes: t.changes.map((c) => (c.path === path ? { ...c, status: "rejected" as const } : c)) }
            : t,
        );
      });
    },
    [],
  );

  const acceptAllFiles = useCallback(
    (turnId: string) => {
      setTurns((prev) =>
        prev.map((t) =>
          t.turnId === turnId
            ? { ...t, changes: t.changes.map((c) => c.status === "pending" ? { ...c, status: "accepted" as const } : c) }
            : t,
        ),
      );
    },
    [],
  );

  const rejectAllFiles = useCallback(
    (turnId: string) => {
      setTurns((prev) => {
        const turn = prev.find((t) => t.turnId === turnId);
        if (turn) {
          for (const change of turn.changes) {
            if (change.status === "pending" && change.before !== null) {
              invoke("write_file", { path: change.path, content: change.before });
            }
          }
        }
        return prev.map((t) =>
          t.turnId === turnId
            ? { ...t, changes: t.changes.map((c) => c.status === "pending" ? { ...c, status: "rejected" as const } : c) }
            : t,
        );
      });
    },
    [],
  );

  return { turns, acceptFile, rejectFile, acceptAllFiles, rejectAllFiles };
}
