import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let mounted = true;

    listen<T>(eventName, (event) => {
      handlerRef.current(event.payload);
    })
      .then((fn) => {
        if (mounted) {
          unlisten = fn;
        } else {
          fn();
        }
      })
      .catch((err) => {
        console.error(`Failed to listen to ${eventName}:`, err);
      });

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, [eventName]);
}
