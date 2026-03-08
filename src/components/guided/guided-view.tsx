import { GuidedCodePane } from "./guided-code-pane";
import { GuidedExplainPane } from "./guided-explain-pane";
import type { GuidedSession, GuidedStep } from "../../types/guided-types";

interface GuidedViewProps {
  session: GuidedSession | null;
  currentStep: GuidedStep | null;
  visibleContent: string;
  animationDone: boolean;
  goNext: () => void;
  goPrev: () => void;
  skipAnimation: () => void;
  acceptCurrent: () => void;
  rejectCurrent: () => void;
  acceptAllRemaining: () => void;
  dismiss: () => void;
}

export function GuidedView({
  session, currentStep, visibleContent, animationDone,
  goNext, goPrev, skipAnimation, acceptCurrent, rejectCurrent, acceptAllRemaining, dismiss,
}: GuidedViewProps) {
  if (!session || !currentStep) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
        no guided session active
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top: code pane — 60% */}
      <div className="flex-[6] min-h-0 flex flex-col">
        <GuidedCodePane
          step={currentStep}
          stepIndex={session.currentIndex}
          totalSteps={session.steps.length}
          visibleContent={visibleContent}
          animationDone={animationDone}
          onSkip={skipAnimation}
        />
      </div>

      {/* Bottom: explain pane — 40% */}
      <div className="flex-[4] min-h-0 flex flex-col">
        <GuidedExplainPane
          steps={session.steps}
          currentIndex={session.currentIndex}
          explanation={currentStep.explanation}
          onPrev={goPrev}
          onNext={goNext}
          onAccept={acceptCurrent}
          onReject={rejectCurrent}
          onAcceptAll={acceptAllRemaining}
          onDone={dismiss}
        />
      </div>
    </div>
  );
}
