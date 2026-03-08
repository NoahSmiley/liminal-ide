import { useCallback, useEffect, useRef, useState } from "react";
import type { AiEvent } from "../types/ai-types";
import type { Message } from "../types/session-types";
import { useTauriEvent } from "./use-tauri-event";

interface AiEventPayload {
  type: "Ai";
  payload: AiEvent;
}

interface SessionEventPayload {
  type: "Session";
  payload: {
    kind: string;
    session_id: string;
    role?: string;
    content?: string;
  };
}

interface RelayEventPayload {
  type: "Relay";
  payload: {
    kind: string;
    device_name?: string;
  };
}

export function useConversation(
  sessionId: string | null,
  initialMessages?: Message[],
  onAdoptSession?: (id: string) => void,
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState(false);
  const prevSessionId = useRef(sessionId);

  useEffect(() => {
    if (prevSessionId.current !== sessionId) {
      setMessages(initialMessages ?? []);
      setStreaming(false);
      setPending(false);
      prevSessionId.current = sessionId;
    }
  }, [sessionId, initialMessages]);

  // Handle session events (user messages from relay devices)
  const handleSessionEvent = useCallback(
    (event: SessionEventPayload) => {
      const payload = event.payload;
      if (payload.kind !== "MessageAdded") return;
      if (sessionId && payload.session_id !== sessionId) return;

      // Auto-adopt session from relay
      if (!sessionId && payload.session_id && onAdoptSession) {
        onAdoptSession(payload.session_id);
      }

      if (payload.role === "user" && payload.content) {
        // Only add if it doesn't duplicate the last user message (local sends)
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "user" && last.content === payload.content) return prev;
          return [...prev, { role: "user", content: payload.content! }];
        });
      }
    },
    [sessionId, onAdoptSession],
  );

  useTauriEvent("session:event", handleSessionEvent);

  const handleAiEvent = useCallback(
    (event: AiEventPayload) => {
      const payload = event.payload;
      if (sessionId && payload.session_id !== sessionId) return;

      // Auto-adopt session from relay when desktop has no active session
      if (!sessionId && payload.session_id && onAdoptSession) {
        onAdoptSession(payload.session_id);
      }

      switch (payload.kind) {
        case "Thinking":
          setPending(false);
          setStreaming(true);
          return;
        case "TextDelta":
          setPending(false);
          setStreaming(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.is_tool_activity) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + payload.content },
              ];
            }
            return [...prev, { role: "assistant", content: payload.content }];
          });
          break;
        case "ToolUse": {
          setPending(false);
          setStreaming(true);
          const isSubagent = payload.name === "Agent" || payload.name === "Task" || payload.name === "Skill";
          let description = payload.name;
          try {
            const parsed = JSON.parse(payload.input);
            if (isSubagent) {
              // Keep the raw input JSON so subagent cards can parse it
              description = payload.input;
            } else if (parsed.file_path) description = parsed.file_path;
            else if (parsed.path) description = parsed.path;
            else if (parsed.command) description = parsed.command;
            else if (parsed.pattern) description = parsed.pattern;
          } catch {
            // input is not valid JSON, use tool name
          }
          setMessages((prev) => [
            ...prev,
            {
              role: "tool",
              content: description,
              tool_name: payload.name,
              tool_id: payload.tool_id,
              is_tool_activity: true,
            },
          ]);
          break;
        }
        case "ToolResult": {
          setMessages((prev) => {
            let idx = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i]?.tool_id === payload.tool_id) {
                idx = i;
                break;
              }
            }
            const target = idx >= 0 ? prev[idx] : undefined;
            if (idx >= 0 && target) {
              const updated = [...prev];
              updated[idx] = { ...target, content: `${target.content} — done` };
              return updated;
            }
            return prev;
          });
          break;
        }
        case "TurnComplete":
          setPending(false);
          setStreaming(false);
          break;
        case "Error":
          setPending(false);
          setStreaming(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `error: ${payload.message}` },
          ]);
          break;
      }
    },
    [sessionId, onAdoptSession],
  );

  useTauriEvent("ai:event", handleAiEvent);

  // Relay connect/disconnect messages
  const handleRelayEvent = useCallback(
    (event: RelayEventPayload) => {
      const { kind, device_name } = event.payload;
      if (kind === "ClientConnected" && device_name) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `${device_name} connected` },
        ]);
      } else if (kind === "ClientDisconnected" && device_name) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `${device_name} disconnected` },
        ]);
      }
    },
    [],
  );

  useTauriEvent("relay:event", handleRelayEvent);

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
  }, []);

  const markPending = useCallback(() => setPending(true), []);

  return { messages, streaming, pending, addUserMessage, markPending };
}
