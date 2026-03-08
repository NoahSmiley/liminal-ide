import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidedSession, GuidedStep } from "../types/guided-types";
import type { TurnChanges } from "./use-change-review";
import type { Message } from "../types/session-types";

const ANIMATION_DURATION_MS = 8000;
const MIN_CHARS_PER_FRAME = 2;

interface GuidedOpts {
  turns: TurnChanges[];
  streaming: boolean;
  guidedEnabled: boolean;
  messages: Message[];
  onSwitchView: (view: "guided" | "chat") => void;
  acceptFile: (turnId: string, path: string) => void;
  rejectFile: (turnId: string, path: string) => void;
  acceptAllFiles: (turnId: string) => void;
}

function extractExplanation(messages: Message[], filePath: string): string {
  const filename = filePath.split("/").pop() ?? filePath;
  // Search recent assistant messages for mentions of this file
  const assistantMsgs = messages.filter((m) => m.role === "assistant" && !m.is_tool_activity);
  for (let i = assistantMsgs.length - 1; i >= 0; i--) {
    const content = assistantMsgs[i]!.content;
    const idx = content.indexOf(filename);
    if (idx === -1) continue;

    // Extract the paragraph surrounding the filename mention
    const before = content.lastIndexOf("\n\n", idx);
    const after = content.indexOf("\n\n", idx);
    const start = before === -1 ? 0 : before + 2;
    const end = after === -1 ? content.length : after;
    const paragraph = content.slice(start, end).trim();
    if (paragraph.length > 10) return paragraph;
  }
  return `Updated \`${filename}\``;
}

export function useGuidedWalkthrough({
  turns, streaming, guidedEnabled, messages,
  onSwitchView, acceptFile, rejectFile, acceptAllFiles,
}: GuidedOpts) {
  const [session, setSession] = useState<GuidedSession | null>(null);
  const [visibleContent, setVisibleContent] = useState("");
  const [animationDone, setAnimationDone] = useState(false);
  const animRef = useRef<number>(0);
  const processedTurns = useRef<Set<string>>(new Set());

  // Watch for new turns with pending changes when guided is enabled
  useEffect(() => {
    if (!guidedEnabled || streaming) return;
    const latest = turns[turns.length - 1];
    if (!latest) return;
    if (processedTurns.current.has(latest.turnId)) return;
    const pendingChanges = latest.changes.filter((c) => c.status === "pending");
    if (pendingChanges.length === 0) return;

    processedTurns.current.add(latest.turnId);

    const steps: GuidedStep[] = pendingChanges.map((c) => ({
      path: c.path,
      changeType: c.change_type,
      before: c.before,
      after: c.after,
      explanation: extractExplanation(messages, c.path),
      status: c.status,
    }));

    setSession({ turnId: latest.turnId, steps, currentIndex: 0, animationDone: false });
    setAnimationDone(false);
    onSwitchView("guided");
  }, [turns, streaming, guidedEnabled, messages, onSwitchView]);

  // Run animation when session/currentIndex changes
  useEffect(() => {
    if (!session) return;
    const step = session.steps[session.currentIndex];
    if (!step) return;

    cancelAnimationFrame(animRef.current);
    setAnimationDone(false);
    setVisibleContent("");

    const content = step.after;
    const frames = (ANIMATION_DURATION_MS / 1000) * 60;
    const charsPerFrame = Math.max(MIN_CHARS_PER_FRAME, Math.ceil(content.length / frames));
    let pos = 0;

    const tick = () => {
      pos = Math.min(pos + charsPerFrame, content.length);
      setVisibleContent(content.slice(0, pos));

      if (pos >= content.length) {
        setAnimationDone(true);
      } else {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [session?.turnId, session?.currentIndex]);

  const skipAnimation = useCallback(() => {
    if (!session) return;
    cancelAnimationFrame(animRef.current);
    const step = session.steps[session.currentIndex];
    if (step) {
      setVisibleContent(step.after);
      setAnimationDone(true);
    }
  }, [session]);

  const goNext = useCallback(() => {
    setSession((s) => s && s.currentIndex < s.steps.length - 1
      ? { ...s, currentIndex: s.currentIndex + 1 }
      : s
    );
  }, []);

  const goPrev = useCallback(() => {
    setSession((s) => s && s.currentIndex > 0
      ? { ...s, currentIndex: s.currentIndex - 1 }
      : s
    );
  }, []);

  const syncStepStatus = useCallback((path: string, status: "accepted" | "rejected") => {
    setSession((s) => s ? {
      ...s,
      steps: s.steps.map((st) => st.path === path ? { ...st, status } : st),
    } : s);
  }, []);

  const acceptCurrent = useCallback(() => {
    if (!session) return;
    const step = session.steps[session.currentIndex];
    if (!step) return;
    acceptFile(session.turnId, step.path);
    syncStepStatus(step.path, "accepted");
  }, [session, acceptFile, syncStepStatus]);

  const rejectCurrent = useCallback(() => {
    if (!session) return;
    const step = session.steps[session.currentIndex];
    if (!step) return;
    rejectFile(session.turnId, step.path);
    syncStepStatus(step.path, "rejected");
  }, [session, rejectFile, syncStepStatus]);

  const acceptAllRemaining = useCallback(() => {
    if (!session) return;
    acceptAllFiles(session.turnId);
    setSession((s) => s ? {
      ...s,
      steps: s.steps.map((st) => st.status === "pending" ? { ...st, status: "accepted" } : st),
    } : s);
  }, [session, acceptAllFiles]);

  const dismiss = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setSession(null);
    setVisibleContent("");
    setAnimationDone(false);
    onSwitchView("chat");
  }, [onSwitchView]);

  const currentStep = session ? session.steps[session.currentIndex] ?? null : null;

  return {
    session,
    currentStep,
    visibleContent,
    animationDone,
    goNext,
    goPrev,
    skipAnimation,
    acceptCurrent,
    rejectCurrent,
    acceptAllRemaining,
    dismiss,
  };
}
