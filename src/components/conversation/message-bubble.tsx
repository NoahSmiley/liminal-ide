import type { Message } from "../../types/session-types";
import { CodeBlock } from "./code-block";
import { ToolActivity } from "./tool-activity";
import { parseContent } from "../../lib/parse-content";
import { renderMarkdown } from "../../lib/render-markdown";

interface MessageBubbleProps {
  message: Message;
  onOpenFile?: (path: string) => void;
}

export function MessageBubble({ message, onOpenFile }: MessageBubbleProps) {
  if (message.is_tool_activity) {
    return <ToolActivity message={message} onOpenFile={onOpenFile} />;
  }

  const isUser = message.role === "user";
  const parts = isUser ? null : parseContent(message.content);

  return (
    <div className={`mb-2 ${isUser ? "pl-2 border-l-2 border-zinc-800" : ""}`}>
      <div className="flex items-start gap-2">
        <span className={`text-[13px] w-4 shrink-0 pt-0.5 ${isUser ? "text-zinc-500" : "text-zinc-700"}`}>
          {isUser ? ">" : "~"}
        </span>
        <div className="flex-1 min-w-0">
          {isUser || !parts ? (
            <p className="text-zinc-200 whitespace-pre-wrap break-words text-[15px]">
              {message.content}
            </p>
          ) : (
            parts.map((part, i) =>
              part.type === "text" ? (
                <div key={i} className="text-zinc-400 break-words text-[15px]">
                  {renderMarkdown(part.text)}
                </div>
              ) : (
                <CodeBlock key={i} code={part.code} filename={part.language} />
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
