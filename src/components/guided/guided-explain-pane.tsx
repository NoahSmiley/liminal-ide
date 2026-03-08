import { BotFace } from "../shared/bot-face";
import { renderMarkdown } from "../../lib/render-markdown";
import type { GuidedStep } from "../../types/guided-types";

interface GuidedExplainPaneProps {
  steps: GuidedStep[];
  currentIndex: number;
  explanation: string;
  onPrev: () => void;
  onNext: () => void;
  onAccept: () => void;
  onReject: () => void;
  onAcceptAll: () => void;
  onDone: () => void;
}

const statusColor: Record<string, string> = {
  pending: "bg-zinc-700",
  accepted: "bg-cyan-400",
  rejected: "bg-red-400",
};

export function GuidedExplainPane({
  steps, currentIndex, explanation,
  onPrev, onNext, onAccept, onReject, onAcceptAll, onDone,
}: GuidedExplainPaneProps) {
  const current = steps[currentIndex];
  const hasPending = steps.some((s) => s.status === "pending");
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="flex flex-col min-h-0 border-t border-zinc-800/40">
      {/* Explanation */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div className="flex items-start gap-2.5">
          <BotFace size={24} />
          <div className="text-zinc-400 text-[11px] leading-relaxed min-w-0">
            {renderMarkdown(explanation)}
          </div>
        </div>
      </div>

      {/* Status dots */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-t border-zinc-800/20">
        {steps.map((step, i) => (
          <div
            key={step.path}
            title={step.path.split("/").pop()}
            className={`w-2 h-2 rounded-full transition-colors ${statusColor[step.status] ?? "bg-zinc-700"} ${
              i === currentIndex ? "ring-1 ring-zinc-400 ring-offset-1 ring-offset-zinc-950" : ""
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/40 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="text-[10px] px-2.5 py-1 rounded-[3px] border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            prev
          </button>
          <button
            onClick={onNext}
            disabled={isLast}
            className="text-[10px] px-2.5 py-1 rounded-[3px] border border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            next
          </button>
        </div>

        <div className="flex items-center gap-2">
          {current?.status === "pending" && (
            <>
              <button
                onClick={onReject}
                className="text-[10px] px-2.5 py-1 rounded-[3px] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
              >
                reject
              </button>
              <button
                onClick={onAccept}
                className="text-[10px] px-2.5 py-1 rounded-[3px] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors"
              >
                accept
              </button>
            </>
          )}
          {current?.status !== "pending" && (
            <span className={`text-[10px] ${current?.status === "accepted" ? "text-cyan-400" : "text-red-400"}`}>
              {current?.status}
            </span>
          )}
          {hasPending && (
            <button
              onClick={onAcceptAll}
              className="text-[10px] px-2.5 py-1 rounded-[3px] border border-cyan-500/10 text-cyan-600 hover:text-cyan-400 hover:border-cyan-500/20 transition-colors"
            >
              accept all
            </button>
          )}
          <button
            onClick={onDone}
            className="text-[10px] px-2.5 py-1 rounded-[3px] bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
          >
            done
          </button>
        </div>
      </div>
    </div>
  );
}
