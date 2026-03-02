import { useEffect, useRef } from "react";
import type { Message } from "../../types/session-types";
import { MessageBubble } from "./message-bubble";

interface ConversationStreamProps {
  messages: Message[];
  streaming: boolean;
}

export function ConversationStream({
  messages,
  streaming,
}: ConversationStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-zinc-600 text-[12px]">
        start a conversation — type below
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {streaming && (
        <span className="text-zinc-600 text-[11px] animate-blink">|</span>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
