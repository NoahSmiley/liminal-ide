import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";
import type { CollabStatus, RemoteCursor } from "../types/collab-types";

interface CollabEventPayload {
  type: "Collab";
  payload: { kind: string; user_name?: string; file?: string; line?: number; col?: number; room_id?: string; content?: string };
}

export function useCollab() {
  const [status, setStatus] = useState<CollabStatus>({ connected: false, room_id: null });
  const [loading, setLoading] = useState(false);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useTauriEvent<CollabEventPayload>("collab:event", (event) => {
    const p = event.payload;
    if (p.kind === "CursorUpdate" && p.user_name && p.file && p.line != null && p.col != null) {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.user_name !== p.user_name);
        return [...filtered, { user_name: p.user_name!, file: p.file!, line: p.line!, col: p.col! }];
      });
    }
    if (p.kind === "UserLeft" && p.user_name) {
      setCursors((prev) => prev.filter((c) => c.user_name !== p.user_name));
    }
  });

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<CollabStatus>("collab_get_status");
      setStatus(result);
    } catch (err) {
      console.error("Collab status failed:", err);
    }
  }, []);

  const createRoom = useCallback(async (serverUrl: string) => {
    setLoading(true);
    try {
      const roomId = await invoke<string>("collab_create_room", { serverUrl });
      await refresh();
      return roomId;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const joinRoom = useCallback(async (serverUrl: string, roomId: string) => {
    setLoading(true);
    try {
      await invoke("collab_join_room", { serverUrl, roomId });
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const leave = useCallback(async () => {
    await invoke("collab_leave");
    setCursors([]);
    await refresh();
  }, [refresh]);

  const sendMessage = useCallback(async (content: string) => {
    await invoke("collab_send_message", { content });
  }, []);

  const setUserName = useCallback(async (name: string) => {
    await invoke("collab_set_user_name", { name });
  }, []);

  const sendCursorUpdate = useCallback(async (file: string, line: number, col: number) => {
    await invoke("collab_send_cursor_update", { file, line, col }).catch(() => {});
  }, []);

  return {
    status, loading, cursors, refresh,
    createRoom, joinRoom, leave,
    sendMessage, setUserName, sendCursorUpdate,
  };
}
