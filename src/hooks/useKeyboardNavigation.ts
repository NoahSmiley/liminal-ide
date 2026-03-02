import { useState, useCallback, useEffect } from "react";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  enabled?: boolean;
  onSelect?: (index: number) => void;
  wrap?: boolean;
}

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useKeyboardNavigation({
  itemCount,
  enabled = true,
  onSelect,
  wrap = true,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Clamp index when item count changes
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (prev < 0) return prev;
      if (itemCount === 0) return -1;
      return Math.min(prev, itemCount - 1);
    });
  }, [itemCount]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) setSelectedIndex(-1);
  }, [enabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || itemCount === 0 || isInputFocused()) return;

      const move = (delta: number) => {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const current = prev < 0 ? (delta > 0 ? -1 : itemCount) : prev;
          let next = current + delta;
          if (wrap) {
            next = ((next % itemCount) + itemCount) % itemCount;
          } else {
            next = Math.max(0, Math.min(next, itemCount - 1));
          }
          return next;
        });
      };

      if (e.key === "j" || e.key === "ArrowDown") {
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        move(-1);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onSelect?.(selectedIndex);
      }
    },
    [enabled, itemCount, wrap, selectedIndex, onSelect],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}
