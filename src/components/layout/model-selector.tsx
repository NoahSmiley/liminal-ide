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
        className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>{model}</span>
        <span className="text-[10px] text-zinc-600">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 border border-zinc-800 bg-zinc-950 rounded z-50 min-w-[100px]">
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-[13px] transition-colors ${
                opt === model ? "text-zinc-200 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
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
