import { useCallback, useEffect, useRef, useState } from "react";
import type { FsEvent } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

interface FsEventPayload {
  type: "Fs";
  payload: FsEvent;
}

const ANIMATION_DURATION_MS = 8000;
const MIN_CHARS_PER_FRAME = 2;

export interface FilePreview {
  path: string;
  fullContent: string;
  visibleContent: string;
  done: boolean;
}

interface AiFileStreamOpts {
  onFileReady?: (path: string, content: string) => void;
}

export function useAiFileStream({ onFileReady }: AiFileStreamOpts) {
  const [previews, setPreviews] = useState<Map<string, FilePreview>>(new Map());
  const animationsRef = useRef<Map<string, number>>(new Map());
  const onFileReadyRef = useRef(onFileReady);
  onFileReadyRef.current = onFileReady;

  const startAnimation = useCallback((path: string, content: string) => {
    // Cancel existing animation for this path
    const existing = animationsRef.current.get(path);
    if (existing) cancelAnimationFrame(existing);

    const frames = (ANIMATION_DURATION_MS / 1000) * 60;
    const charsPerFrame = Math.max(MIN_CHARS_PER_FRAME, Math.ceil(content.length / frames));
    let pos = 0;

    // Initialize preview
    setPreviews((prev) => {
      const next = new Map(prev);
      next.set(path, { path, fullContent: content, visibleContent: "", done: false });
      return next;
    });

    const tick = () => {
      pos = Math.min(pos + charsPerFrame, content.length);
      const visible = content.slice(0, pos);
      const done = pos >= content.length;

      setPreviews((prev) => {
        const next = new Map(prev);
        next.set(path, { path, fullContent: content, visibleContent: visible, done });
        return next;
      });

      if (done) {
        animationsRef.current.delete(path);
        onFileReadyRef.current?.(path, content);
      } else {
        animationsRef.current.set(path, requestAnimationFrame(tick));
      }
    };

    animationsRef.current.set(path, requestAnimationFrame(tick));
  }, []);

  const handleFsEvent = useCallback(
    (event: FsEventPayload) => {
      const payload = event.payload;
      if (payload.kind !== "FileCreated" && payload.kind !== "FileModified") return;
      if (!payload.content) return;
      startAnimation(payload.path, payload.content);
    },
    [startAnimation],
  );

  useTauriEvent("fs:event", handleFsEvent);

  // Cleanup all animations on unmount
  useEffect(() => {
    return () => {
      for (const raf of animationsRef.current.values()) {
        cancelAnimationFrame(raf);
      }
    };
  }, []);

  const clearPreviews = useCallback(() => {
    for (const raf of animationsRef.current.values()) {
      cancelAnimationFrame(raf);
    }
    animationsRef.current.clear();
    setPreviews(new Map());
  }, []);

  return { previews, clearPreviews };
}
