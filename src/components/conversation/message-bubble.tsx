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

  if (message.role === "system") {
    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-zinc-700 text-[10px] uppercase tracking-widest">
          {message.content}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    );
  }

  const isUser = message.role === "user";
  const parts = isUser ? null : parseContent(message.content);

  if (isUser) {
    return (
      <div className="border-l-2 border-cyan-500/30 bg-white/[0.02] rounded-r-[3px] pl-4 py-2 pr-3">
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 select-none">you</div>
        <p className="text-zinc-300 whitespace-pre-wrap break-words text-[11px] leading-[1.6] tracking-wide">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="pl-1">
      <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 select-none">liminal</div>
      {parts ? (
        parts.map((part, i) =>
          part.type === "text" ? (
            <div key={i} className="text-zinc-200 break-words text-[11px] leading-[1.6]">
              {renderMarkdown(part.text)}
            </div>
          ) : (
            <CodeBlock key={i} code={part.code} filename={part.language} />
          ),
        )
      ) : (
        <p className="text-zinc-200 whitespace-pre-wrap break-words text-[11px] leading-[1.6]">
          {message.content}
        </p>
      )}
    </div>
  );
}
