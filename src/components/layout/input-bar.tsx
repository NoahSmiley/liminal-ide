import { useState, useRef, useEffect, useCallback } from "react";

interface InputBarProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
  confirmMode?: boolean;
}

export function InputBar({ onSubmit, disabled, confirmMode }: InputBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    historyRef.current.push(trimmed);
    historyIndexRef.current = -1;
    onSubmit(trimmed);
    setValue("");
  }, [value, onSubmit]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
        return;
      }
      const history = historyRef.current;
      if (e.key === "ArrowUp" && history.length > 0) {
        e.preventDefault();
        const idx = historyIndexRef.current === -1
          ? history.length - 1
          : Math.max(0, historyIndexRef.current - 1);
        historyIndexRef.current = idx;
        setValue(history[idx] ?? "");
      }
      if (e.key === "ArrowDown" && historyIndexRef.current >= 0) {
        e.preventDefault();
        const idx = historyIndexRef.current + 1;
        if (idx >= history.length) {
          historyIndexRef.current = -1;
          setValue("");
        } else {
          historyIndexRef.current = idx;
          setValue(history[idx] ?? "");
        }
      }
    },
    [handleSubmit],
  );

  if (confirmMode) {
    return (
      <div data-tutorial="input-bar" className="px-4 py-3">
        <div className="w-full flex items-center justify-center gap-2">
          <span className="text-zinc-700 text-[13px] select-none">{"\u276f"}</span>
          <button onClick={() => onSubmit("yes")}
            className="px-5 py-1 text-[15px] border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 active:scale-95 active:bg-zinc-800 transition-all duration-100">
            yes
          </button>
          <button onClick={() => onSubmit("no")}
            className="px-5 py-1 text-[15px] border border-zinc-800/60 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 active:scale-95 active:bg-zinc-800 transition-all duration-100">
            no
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="input-bar" className="px-4 py-3">
      <div className="w-full flex items-center gap-2 px-4 py-2 border border-zinc-800/60 bg-zinc-950/80">
        <span className="text-zinc-600 text-[13px] select-none">{"\u276f"}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="flex-1 bg-transparent text-zinc-300 text-[15px] outline-none placeholder:text-zinc-700"
          placeholder={disabled ? "waiting..." : "message"}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
