import { CodeEditor } from "../file-viewer/code-editor";
import type { GuidedStep } from "../../types/guided-types";

interface GuidedCodePaneProps {
  step: GuidedStep;
  stepIndex: number;
  totalSteps: number;
  visibleContent: string;
  animationDone: boolean;
  onSkip: () => void;
}

export function GuidedCodePane({ step, stepIndex, totalSteps, visibleContent, animationDone, onSkip }: GuidedCodePaneProps) {
  const filename = step.path.split("/").pop() ?? step.path;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-400 text-[11px] font-mono truncate" title={step.path}>
            {filename}
          </span>
          <span className="text-zinc-600 text-[10px] shrink-0">
            {stepIndex + 1} of {totalSteps}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ${
            step.changeType === "created"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}>
            {step.changeType}
          </span>
        </div>
        {!animationDone && (
          <button
            onClick={onSkip}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            skip
          </button>
        )}
      </div>

      {/* Code editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeEditor doc={visibleContent} path={step.path} readOnly />
      </div>
    </div>
  );
}
