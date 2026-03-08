import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";

export interface RelayStatus {
  running: boolean;
  port: number;
  pairing_code: string | null;
  connected_clients: { id: string; device_name: string; device_id: string; connected_at: number }[];
}

export interface CloudStatus {
  connected: boolean;
  cloud_url: string | null;
  account_key: string | null;
}

export interface PairingQR {
  qr_data_url: string;
  host: string;
  port: number;
  code: string;
}

interface RelayEventPayload {
  type: "Relay";
  payload: { kind: string; port?: number; pairing_code?: string; device_name?: string; cloud_url?: string };
}

export function useRelay() {
  const [status, setStatus] = useState<RelayStatus | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [relayResult, cloudResult] = await Promise.all([
        invoke<RelayStatus>("get_relay_status"),
        invoke<CloudStatus>("get_cloud_status"),
      ]);
      setStatus(relayResult);
      setCloudStatus(cloudResult);
    } catch (err) {
      console.error("Relay status failed:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useTauriEvent<RelayEventPayload>("relay:event", () => {
    refresh();
  });

  const startRelay = useCallback(async () => {
    try {
      const result = await invoke<RelayStatus>("start_relay");
      setStatus(result);
      return result;
    } catch (err) {
      console.error("Start relay failed:", err);
      return null;
    }
  }, []);

  const stopRelay = useCallback(async () => {
    try {
      await invoke("stop_relay");
      await refresh();
    } catch (err) {
      console.error("Stop relay failed:", err);
    }
  }, [refresh]);

  const regenerateCode = useCallback(async () => {
    try {
      const code = await invoke<string | null>("regenerate_pairing_code");
      await refresh();
      return code;
    } catch (err) {
      console.error("Regenerate code failed:", err);
      return null;
    }
  }, [refresh]);

  const startCloud = useCallback(async () => {
    try {
      const result = await invoke<CloudStatus>("start_cloud_relay");
      setCloudStatus(result);
      return result;
    } catch (err) {
      console.error("Start cloud relay failed:", err);
      return null;
    }
  }, []);

  const stopCloud = useCallback(async () => {
    try {
      await invoke("stop_cloud_relay");
      await refresh();
    } catch (err) {
      console.error("Stop cloud relay failed:", err);
    }
  }, [refresh]);

  const getAccountKey = useCallback(async () => {
    try {
      return await invoke<string>("get_account_key");
    } catch (err) {
      console.error("Get account key failed:", err);
      return null;
    }
  }, []);

  const setCloudUrl = useCallback(async (url: string) => {
    try {
      await invoke("set_cloud_url", { url });
      await refresh();
    } catch (err) {
      console.error("Set cloud URL failed:", err);
    }
  }, [refresh]);

  const generatePairingQR = useCallback(async () => {
    try {
      const result = await invoke<PairingQR>("generate_pairing_qr");
      await refresh();
      return result;
    } catch (err) {
      console.error("Generate pairing QR failed:", err);
      return null;
    }
  }, [refresh]);

  return {
    status,
    cloudStatus,
    startRelay,
    stopRelay,
    regenerateCode,
    startCloud,
    stopCloud,
    getAccountKey,
    setCloudUrl,
    generatePairingQR,
    refresh,
  };
}
