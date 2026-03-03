import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CollabStatus } from "../types/collab-types";

export function useCollab() {
  const [status, setStatus] = useState<CollabStatus>({ connected: false, room_id: null });
  const [loading, setLoading] = useState(false);

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
    await refresh();
  }, [refresh]);

  const sendMessage = useCallback(async (content: string) => {
    await invoke("collab_send_message", { content });
  }, []);

  const setUserName = useCallback(async (name: string) => {
    await invoke("collab_set_user_name", { name });
  }, []);

  return {
    status, loading, refresh,
    createRoom, joinRoom, leave,
    sendMessage, setUserName,
  };
}
