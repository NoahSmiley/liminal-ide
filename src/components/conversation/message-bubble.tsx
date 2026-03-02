import type { Message } from "../../types/session-types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className="mb-3">
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-zinc-600 w-4 shrink-0 pt-0.5">
          {isUser ? ">" : "~"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-300 whitespace-pre-wrap break-words text-[13px]">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
