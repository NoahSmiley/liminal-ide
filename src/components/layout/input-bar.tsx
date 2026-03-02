import { useState, useRef, useEffect } from "react";

interface InputBarProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export function InputBar({ onSubmit, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="flex items-center px-3 py-2 border-t border-zinc-800">
      <span className="text-zinc-600 mr-2 text-[12px]">$</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={disabled}
        className="flex-1 bg-transparent text-zinc-200 text-[13px] outline-none placeholder:text-zinc-700"
        placeholder={disabled ? "waiting..." : "ask anything, !cmd, or /help"}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
