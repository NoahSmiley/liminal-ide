import { useState, useRef, useEffect } from "react";
import { MODEL_OPTIONS } from "../../types/settings-types";

interface ModelSelectorProps {
  model: string;
  onSelect: (model: string) => void;
}

export function ModelSelector({ model, onSelect }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-[12px] tracking-wide"
      >
        <span className="w-[60px] text-right">{model}</span>
        <span className="text-[9px] text-zinc-600">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 border border-panel-border bg-popover rounded-[3px] shadow-2xl shadow-black/70 z-50 min-w-[120px] py-1.5">
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); setOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-[12px] tracking-wide transition-colors ${
                opt === model ? "text-zinc-200 bg-accent/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-accent/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
