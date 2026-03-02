import type { Agent } from "@/types/agent";

interface TypingIndicatorProps {
  agent: Agent;
}

export function TypingIndicator({ agent }: TypingIndicatorProps) {
  return (
    <div className="px-4 py-1.5">
      <div className="flex gap-2">
        <span className="shrink-0 w-24 text-right text-xs pt-0.5" style={{ color: agent.color }}>
          {agent.name.toLowerCase()}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground pt-0.5">|</span>
        <span className="text-xs text-muted-foreground">
          <span className="animate-blink">_</span>
        </span>
      </div>
    </div>
  );
}
