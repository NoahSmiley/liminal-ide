import { useCallback, useState } from "react";
import type { AiEvent } from "../types/ai-types";
import type { Message } from "../types/session-types";
import { useTauriEvent } from "./use-tauri-event";

interface AiEventPayload {
  type: "Ai";
  payload: AiEvent;
}

export function useConversation(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const handleAiEvent = useCallback(
    (event: AiEventPayload) => {
      const payload = event.payload;
      if (sessionId && payload.session_id !== sessionId) return;

      switch (payload.kind) {
        case "TextDelta":
          setStreaming(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + payload.content },
              ];
            }
            return [...prev, { role: "assistant", content: payload.content }];
          });
          break;
        case "TurnComplete":
          setStreaming(false);
          break;
        case "Error":
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

  return { messages, streaming, addUserMessage };
}
