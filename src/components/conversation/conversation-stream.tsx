import { useEffect, useRef } from "react";
import type { Message } from "../../types/session-types";
import type { FilePreview } from "../../hooks/use-ai-file-stream";
import type { FileChange } from "../../types/change-types";
import { MessageBubble } from "./message-bubble";
import { TurnReviewBar } from "./turn-review-bar";
import { LintResult } from "./lint-result";

interface TurnReviewData {
  turnId: string;
  changes: FileChange[];
  accepted: boolean;
}

interface ConversationStreamProps {
  messages: Message[];
  streaming: boolean;
  pending?: boolean;
  previews?: Map<string, FilePreview>;
  turnReviews?: TurnReviewData[];
  lint?: { success: boolean; output: string; command: string } | null;
  lintRunning?: boolean;
  onOpenFile?: (path: string) => void;
  onAcceptTurn?: (turnId: string) => void;
  onRevertTurn?: (turnId: string) => void;
  onDismissLint?: () => void;
  onSendToAi?: (prompt: string) => void;
}

export function ConversationStream({
  messages, streaming, pending, previews, turnReviews, lint, lintRunning,
  onOpenFile, onAcceptTurn, onRevertTurn, onDismissLint, onSendToAi,
}: ConversationStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, previews, lint]);

  if (messages.length === 0) {
    return <div className="text-zinc-600 text-[12px]">start a conversation -- type below</div>;
  }

  return (
    <div data-tutorial="conversation-stream" className="space-y-1">
      {messages.map((msg, i) => {
        const filePath = msg.is_tool_activity ? msg.content.replace(" — done", "") : undefined;
        const preview = filePath ? previews?.get(filePath) : undefined;
        return <MessageBubble key={i} message={msg} preview={preview} onOpenFile={onOpenFile} />;
      })}
      {turnReviews?.map((tr) => (
        <TurnReviewBar
          key={tr.turnId} turnId={tr.turnId} changes={tr.changes} accepted={tr.accepted}
          onAccept={onAcceptTurn ?? (() => {})} onRevert={onRevertTurn ?? (() => {})}
        />
      ))}
      {lintRunning && (
        <div className="text-[11px] text-zinc-600 animate-pulse">linting...</div>
      )}
      {lint && onDismissLint && (
        <LintResult
          success={lint.success} output={lint.output} command={lint.command}
          onSendToAi={onSendToAi} onDismiss={onDismissLint}
        />
      )}
      {pending && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="animate-pulse">...</span>
          <span>thinking</span>
        </div>
      )}
      {streaming && !pending && (
        <span className="text-zinc-600 text-[11px] animate-blink">|</span>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
