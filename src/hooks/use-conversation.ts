import { useCallback, useEffect, useRef, useState } from "react";
import type { AiEvent } from "../types/ai-types";
import type { Message } from "../types/session-types";
import { useTauriEvent } from "./use-tauri-event";

interface AiEventPayload {
  type: "Ai";
  payload: AiEvent;
}

export function useConversation(sessionId: string | null, initialMessages?: Message[]) {
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

  const handleAiEvent = useCallback(
    (event: AiEventPayload) => {
      const payload = event.payload;
      if (sessionId && payload.session_id !== sessionId) return;

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
          let description = payload.name;
          try {
            const parsed = JSON.parse(payload.input);
            if (parsed.file_path) description = parsed.file_path;
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
    [sessionId],
  );

  useTauriEvent("ai:event", handleAiEvent);

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
  }, []);

  const markPending = useCallback(() => setPending(true), []);

  return { messages, streaming, pending, addUserMessage, markPending };
}
