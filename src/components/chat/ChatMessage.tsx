import ReactMarkdown from "react-markdown";
import { useAgentStore } from "@/stores/agentStore";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const agent = useAgentStore((s) =>
    message.agentId ? s.agents.find((a) => a.id === message.agentId) : undefined,
  );

  const isUser = message.role === "user";

  return (
    <div className="px-2 py-0.5">
      <div className="flex gap-1.5">
        <span className="shrink-0 w-16 text-right text-[10px] pt-0.5">
          {isUser ? (
            <span className="text-muted-foreground">you</span>
          ) : agent ? (
            <span style={{ color: agent.color }}>{agent.name.toLowerCase()}</span>
          ) : (
            <span className="text-muted-foreground">system</span>
          )}
        </span>

        <span className="shrink-0 text-[10px] text-muted-foreground/30 pt-0.5">│</span>

        <div className="flex-1 min-w-0">
          <div className="prose prose-invert prose-sm max-w-none text-xs text-foreground [&_pre]:bg-background [&_pre]:border [&_pre]:border-border [&_pre]:p-1 [&_code]:text-xs [&_p]:leading-relaxed [&_p]:my-0 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_li]:my-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          <span className="text-[10px] text-muted-foreground/20">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
