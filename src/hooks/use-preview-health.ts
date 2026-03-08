import { useEffect, useRef } from "react";

interface UsePreviewHealthOptions {
  url: string | null;
  onStatusChange: (live: boolean) => void;
}

export function usePreviewHealth({ url, onStatusChange }: UsePreviewHealthOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef(false);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!url) {
      if (lastStatusRef.current) {
        lastStatusRef.current = false;
        onStatusChange(false);
      }
      return;
    }

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        await fetch(url, { mode: "no-cors", signal: controller.signal });
        clearTimeout(timeout);
        if (!lastStatusRef.current) {
          lastStatusRef.current = true;
          onStatusChange(true);
        }
      } catch {
        if (lastStatusRef.current) {
          lastStatusRef.current = false;
          onStatusChange(false);
        }
      }
    };

    // Check immediately, then every 3 seconds
    check();
    intervalRef.current = setInterval(check, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [url, onStatusChange]);
}
