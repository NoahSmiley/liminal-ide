import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "type a message..." }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-1.5 border-t border-panel-border px-2 py-1">
      <span className="shrink-0 pb-1 text-[10px] text-muted-foreground">&gt;</span>
      <Textarea
        ref={textareaRef}
        data-slot="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[24px] max-h-[80px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-xs"
      />
      {value.trim() && (
        <span className="shrink-0 pb-1 text-[10px] text-muted-foreground/30">
          enter to send
        </span>
      )}
    </div>
  );
}
