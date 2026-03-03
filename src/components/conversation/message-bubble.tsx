import type { Message } from "../../types/session-types";
import type { FilePreview } from "../../hooks/use-ai-file-stream";
import { CodeBlock } from "./code-block";
import { ToolActivity } from "./tool-activity";
import { parseContent } from "../../lib/parse-content";
import { renderMarkdown } from "../../lib/render-markdown";

interface MessageBubbleProps {
  message: Message;
  preview?: FilePreview;
  onOpenFile?: (path: string) => void;
}

export function MessageBubble({ message, preview, onOpenFile }: MessageBubbleProps) {
  if (message.is_tool_activity) {
    return <ToolActivity message={message} preview={preview} onOpenFile={onOpenFile} />;
  }

  const isUser = message.role === "user";
  const parts = isUser ? null : parseContent(message.content);

  return (
    <div className="mb-3">
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-zinc-600 w-4 shrink-0 pt-0.5">
          {isUser ? ">" : "~"}
        </span>
        <div className="flex-1 min-w-0">
          {isUser || !parts ? (
            <p className="text-zinc-300 whitespace-pre-wrap break-words text-[13px]">
              {message.content}
            </p>
          ) : (
            parts.map((part, i) =>
              part.type === "text" ? (
                <div key={i} className="text-zinc-300 break-words text-[13px]">
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
