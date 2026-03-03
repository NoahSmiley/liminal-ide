import { useCallback, useEffect, useRef, useState } from "react";

interface RenameInputProps {
  currentName: string;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
}

export function RenameInput({ currentName, onSubmit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  }, [value, currentName, onSubmit, onCancel]);

  return (
    <input
      ref={inputRef}
      className="bg-transparent border-b border-zinc-700 text-zinc-300 text-[11px] px-0.5 outline-none w-full"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSubmit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={onCancel}
    />
  );
}
