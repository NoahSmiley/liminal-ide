import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";
import type { LspDiagnostic, LspEvent } from "../types/lsp-types";

interface LspEventPayload {
  type: "Lsp";
  payload: LspEvent;
}

export function useLsp(filePath: string | null, buffer?: string) {
  const [diagnostics, setDiagnostics] = useState<LspDiagnostic[]>([]);
  const [servers, setServers] = useState<string[]>([]);
  const versionRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLspEvent = useCallback(
    (event: LspEventPayload) => {
      const payload = event.payload;
      if (payload.kind === "Diagnostics" && filePath) {
        const fileUri = `file://${filePath}`;
        if (payload.data.uri === fileUri) {
          setDiagnostics(payload.data.diagnostics);
        }
      }
      if (payload.kind === "ServerStarted") {
        setServers((prev) => [...prev, payload.name]);
      }
    },
    [filePath],
  );

  useTauriEvent("lsp:event", handleLspEvent);

  // Reset diagnostics when file changes
  useEffect(() => {
    setDiagnostics([]);
    versionRef.current = 0;
  }, [filePath]);

  // Debounced didChange on buffer update
  useEffect(() => {
    if (!filePath || !buffer || servers.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      versionRef.current += 1;
      const serverName = servers[0]!;
      invoke("lsp_did_change", {
        serverName,
        path: filePath,
        content: buffer,
        version: versionRef.current,
      }).catch(() => {});
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buffer, filePath, servers]);

  return { diagnostics, servers };
}
