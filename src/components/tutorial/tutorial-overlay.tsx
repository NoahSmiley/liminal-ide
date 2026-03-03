import { useEffect, useState, useCallback } from "react";
import { TutorialSpotlight } from "./tutorial-spotlight";
import { TutorialCard } from "./tutorial-card";
import type { TutorialState } from "../../hooks/use-tutorial";

const SPOTLIGHT_PADDING = 6;

function useTargetRect(selector: string | undefined): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) { setRect(null); return; }
    const el = document.querySelector(selector);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());

    const onResize = () => {
      const r = document.querySelector(selector)?.getBoundingClientRect() ?? null;
      setRect(r);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [selector]);

  return rect;
}

function computeCardPosition(targetRect: DOMRect | null): React.CSSProperties {
  if (!targetRect) {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = 320;
  const cardH = 240;
  const gap = 12;

  const centerX = targetRect.x + targetRect.width / 2;
  const centerY = targetRect.y + targetRect.height / 2;

  let top: number;
  let left: number;

  if (centerX < vw / 2) {
    left = Math.min(targetRect.right + gap, vw - cardW - 8);
  } else {
    left = Math.max(targetRect.left - cardW - gap, 8);
  }

  if (centerY < vh / 2) {
    top = Math.max(targetRect.top, 8);
  } else {
    top = Math.max(targetRect.bottom - cardH, 8);
  }

  top = Math.min(top, vh - cardH - 8);
  left = Math.max(left, 8);

  return { position: "fixed", top, left };
}

interface TutorialOverlayProps {
  tutorial: TutorialState;
}

export function TutorialOverlay({ tutorial }: TutorialOverlayProps) {
  const { currentStep, currentSection, sectionIndex, stepIndex, totalSections, totalStepsInSection, isFirst, isLast, next, prev, close } = tutorial;
  const targetRect = useTargetRect(currentStep.targetSelector);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); return; }
    },
    [close, next, prev],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const cardStyle = computeCardPosition(targetRect);

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={close} className="absolute inset-0">
        <TutorialSpotlight targetRect={targetRect} padding={SPOTLIGHT_PADDING} />
      </div>

      <div style={{ ...cardStyle, zIndex: 51 }}>
        <TutorialCard
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionName={currentSection.name}
          stepIndex={stepIndex}
          totalSteps={totalStepsInSection}
          title={currentStep.title}
          body={currentStep.body}
          ascii={currentStep.ascii}
          hint={currentStep.hint}
          isFirst={isFirst}
          isLast={isLast}
          onPrev={prev}
          onNext={next}
        />
      </div>
    </div>
  );
}
