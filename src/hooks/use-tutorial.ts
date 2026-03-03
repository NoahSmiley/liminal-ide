import { useState, useCallback, useMemo } from "react";
import { TUTORIAL_SECTIONS_1_8 } from "../lib/tutorial-steps";
import { TUTORIAL_SECTIONS_9_16 } from "../lib/tutorial-steps-more";
import type { TutorialSection, TutorialStep } from "../lib/tutorial-steps";

const STORAGE_KEY = "liminal-tutorial-position";
const ALL_SECTIONS: TutorialSection[] = [...TUTORIAL_SECTIONS_1_8, ...TUTORIAL_SECTIONS_9_16];

function loadPosition(): { sectionIndex: number; stepIndex: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sectionIndex: 0, stepIndex: 0 };
    const parsed = JSON.parse(raw) as { sectionIndex: number; stepIndex: number };
    if (parsed.sectionIndex < ALL_SECTIONS.length && parsed.stepIndex < (ALL_SECTIONS[parsed.sectionIndex]?.steps.length ?? 0)) {
      return parsed;
    }
  } catch { /* ignore */ }
  return { sectionIndex: 0, stepIndex: 0 };
}

function savePosition(sectionIndex: number, stepIndex: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sectionIndex, stepIndex }));
}

export interface TutorialState {
  open: boolean;
  sectionIndex: number;
  stepIndex: number;
  currentStep: TutorialStep;
  currentSection: TutorialSection;
  totalSections: number;
  totalStepsInSection: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  goTo: (section: number, step: number) => void;
  close: () => void;
  toggle: () => void;
}

export function useTutorial(): TutorialState {
  const [open, setOpen] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(() => loadPosition().sectionIndex);
  const [stepIndex, setStepIndex] = useState(() => loadPosition().stepIndex);

  // ALL_SECTIONS is statically defined and non-empty; loadPosition validates bounds
  const section = ALL_SECTIONS[sectionIndex] as TutorialSection;
  const step = section.steps[stepIndex] as TutorialStep;

  const isFirst = sectionIndex === 0 && stepIndex === 0;
  const isLast = sectionIndex === ALL_SECTIONS.length - 1 && stepIndex === section.steps.length - 1;

  const next = useCallback(() => {
    const sec = ALL_SECTIONS[sectionIndex];
    if (!sec) return;
    if (stepIndex < sec.steps.length - 1) {
      const ns = stepIndex + 1;
      setStepIndex(ns);
      savePosition(sectionIndex, ns);
    } else if (sectionIndex < ALL_SECTIONS.length - 1) {
      const ns = sectionIndex + 1;
      setSectionIndex(ns);
      setStepIndex(0);
      savePosition(ns, 0);
    } else {
      setOpen(false);
    }
  }, [sectionIndex, stepIndex]);

  const prev = useCallback(() => {
    if (stepIndex > 0) {
      const ns = stepIndex - 1;
      setStepIndex(ns);
      savePosition(sectionIndex, ns);
    } else if (sectionIndex > 0) {
      const ns = sectionIndex - 1;
      const lastStep = (ALL_SECTIONS[ns]?.steps.length ?? 1) - 1;
      setSectionIndex(ns);
      setStepIndex(lastStep);
      savePosition(ns, lastStep);
    }
  }, [sectionIndex, stepIndex]);

  const goTo = useCallback((sec: number, stp: number) => {
    setSectionIndex(sec);
    setStepIndex(stp);
    savePosition(sec, stp);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return useMemo(() => ({
    open, sectionIndex, stepIndex,
    currentStep: step, currentSection: section,
    totalSections: ALL_SECTIONS.length,
    totalStepsInSection: section.steps.length,
    isFirst, isLast, next, prev, goTo, close, toggle,
  }), [open, sectionIndex, stepIndex, step, section, isFirst, isLast, next, prev, goTo, close, toggle]);
}
