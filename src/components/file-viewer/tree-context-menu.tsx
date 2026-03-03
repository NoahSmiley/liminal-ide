import { useCallback, useEffect, useRef } from "react";

interface ContextMenuAction {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface TreeContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export function TreeContextMenu({ x, y, actions, onClose }: TreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-zinc-900 border border-zinc-700 py-0.5 min-w-[120px] shadow-lg"
      style={{ left: x, top: y }}
    >
      {actions.map((item) => (
        <button
          key={item.label}
          onClick={() => handleAction(item.action)}
          className={`block w-full text-left px-3 py-1 text-[11px] hover:bg-zinc-800 ${
            item.danger ? "text-red-400 hover:text-red-300" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
