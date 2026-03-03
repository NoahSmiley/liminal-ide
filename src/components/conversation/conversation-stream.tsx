import { useEffect, useMemo, useRef } from "react";
import type { Message } from "../../types/session-types";
import type { FileChange } from "../../types/change-types";
import { MessageBubble } from "./message-bubble";
import { ToolActivityGroup } from "./tool-activity-group";
import { TurnReviewBar } from "./turn-review-bar";
import { LintResult } from "./lint-result";

type GroupedItem = Message | Message[];

function groupMessages(messages: Message[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let toolBatch: Message[] = [];
  const flushBatch = () => {
    if (toolBatch.length === 0) return;
    result.push(toolBatch.length === 1 ? toolBatch[0]! : [...toolBatch]);
    toolBatch = [];
  };
  for (const msg of messages) {
    if (msg.is_tool_activity) {
      toolBatch.push(msg);
    } else {
      flushBatch();
      result.push(msg);
    }
  }
  flushBatch();
  return result;
}

function isTurnBoundary(item: GroupedItem, prev: GroupedItem): boolean {
  const cur = Array.isArray(item) ? null : item;
  if (!cur || cur.role !== "user") return false;
  const p = Array.isArray(prev) ? null : prev;
  return !p || p.role !== "user";
}

interface TurnReviewData {
  turnId: string;
  changes: FileChange[];
}

interface ConversationStreamProps {
  messages: Message[];
  streaming: boolean;
  pending?: boolean;
  turnReviews?: TurnReviewData[];
  lint?: { success: boolean; output: string; command: string } | null;
  lintRunning?: boolean;
  onOpenFile?: (path: string) => void;
  onAcceptFile?: (turnId: string, path: string) => void;
  onRejectFile?: (turnId: string, path: string) => void;
  onAcceptAll?: (turnId: string) => void;
  onRejectAll?: (turnId: string) => void;
  onDismissLint?: () => void;
  onSendToAi?: (prompt: string) => void;
}

export function ConversationStream({
  messages, streaming, pending, turnReviews, lint, lintRunning,
  onOpenFile, onAcceptFile, onRejectFile, onAcceptAll, onRejectAll, onDismissLint, onSendToAi,
}: ConversationStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lint]);

  if (messages.length === 0) {
    return <div className="text-zinc-600 text-[12px]">start a conversation -- type below</div>;
  }

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div data-tutorial="conversation-stream" className="space-y-1">
      {grouped.map((item, i) => {
        const prev = grouped[i - 1];
        const turnGap = i > 0 && prev !== undefined && isTurnBoundary(item, prev);
        return Array.isArray(item) ? (
          <ToolActivityGroup key={i} messages={item} onOpenFile={onOpenFile} />
        ) : (
          <div key={i} className={turnGap ? "mt-6" : undefined}>
            <MessageBubble message={item} onOpenFile={onOpenFile} />
          </div>
        );
      })}
      {turnReviews?.map((tr) => (
        <TurnReviewBar
          key={tr.turnId}
          turnId={tr.turnId}
          changes={tr.changes}
          onAcceptFile={onAcceptFile ?? (() => {})}
          onRejectFile={onRejectFile ?? (() => {})}
          onAcceptAll={onAcceptAll ?? (() => {})}
          onRejectAll={onRejectAll ?? (() => {})}
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
