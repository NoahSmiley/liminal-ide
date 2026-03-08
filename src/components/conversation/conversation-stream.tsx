import { useEffect, useMemo, useRef } from "react";
import type { Message } from "../../types/session-types";
import type { FileChange } from "../../types/change-types";
import { MessageBubble } from "./message-bubble";
import { ToolActivityGroup } from "./tool-activity-group";
import { SubagentCard } from "./subagent-card";
import { TurnReviewBar } from "./turn-review-bar";
import { LintResult } from "./lint-result";
import { isSubagentTool, parseSubagentDescription } from "../../lib/subagent-detect";

type SubagentGroup = { kind: "subagent"; description: string; toolName: string; messages: Message[] };
type GroupedItem = Message | Message[] | SubagentGroup;

function groupMessages(messages: Message[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let toolBatch: Message[] = [];
  let subagent: SubagentGroup | null = null;

  const flushBatch = () => {
    if (toolBatch.length === 0) return;
    result.push(toolBatch.length === 1 ? toolBatch[0]! : [...toolBatch]);
    toolBatch = [];
  };
  const flushSubagent = () => {
    if (!subagent) return;
    result.push(subagent);
    subagent = null;
  };

  for (const msg of messages) {
    if (msg.is_tool_activity && isSubagentTool(msg.tool_name ?? "")) {
      // Start of a subagent — flush any regular tool batch first
      flushBatch();
      flushSubagent();
      subagent = {
        kind: "subagent",
        description: parseSubagentDescription(msg.content),
        toolName: msg.tool_name!,
        messages: [msg],
      };
    } else if (msg.is_tool_activity && subagent) {
      // Child tool activity within a subagent run
      subagent.messages.push(msg);
    } else if (msg.is_tool_activity) {
      toolBatch.push(msg);
    } else {
      flushBatch();
      flushSubagent();
      result.push(msg);
    }
  }
  flushBatch();
  flushSubagent();
  return result;
}

function isSubagentGroup(item: GroupedItem): item is SubagentGroup {
  return typeof item === "object" && !Array.isArray(item) && "kind" in item && item.kind === "subagent";
}

function isTurnBoundary(item: GroupedItem, prev: GroupedItem): boolean {
  if (Array.isArray(item) || isSubagentGroup(item)) return false;
  const cur = item;
  if (cur.role !== "user") return false;
  if (Array.isArray(prev) || isSubagentGroup(prev)) return false;
  return prev.role !== "user";
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
    return null;
  }

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div data-tutorial="conversation-stream">
      {grouped.map((item, i) => {
        const prev = grouped[i - 1];
        const turnGap = i > 0 && prev !== undefined && isTurnBoundary(item, prev);
        if (isSubagentGroup(item)) {
          return (
            <SubagentCard key={i} description={item.description} toolName={item.toolName} messages={item.messages} onOpenFile={onOpenFile} />
          );
        }
        return Array.isArray(item) ? (
          <div key={i} className="mt-2">
            <ToolActivityGroup messages={item} onOpenFile={onOpenFile} />
          </div>
        ) : (
          <div key={i} className={turnGap ? "mt-8" : "mt-4"}>
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
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-1">
            <span className="text-sky-500/70 text-[10px] animate-pulse-dot">◆</span>
            <span className="text-sky-500/70 text-[10px] animate-pulse-dot-delay-1">◆</span>
            <span className="text-sky-500/70 text-[10px] animate-pulse-dot-delay-2">◆</span>
          </span>
          <span className="text-zinc-600 text-[11px]">thinking</span>
        </div>
      )}
      {streaming && !pending && (
        <span className="inline-block w-[6px] h-[13px] bg-sky-500/30 rounded-sm animate-blink" />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
