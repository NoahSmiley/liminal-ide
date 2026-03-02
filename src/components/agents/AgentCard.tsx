import { useEffect, useRef } from "react";
import { AgentAvatar } from "./AgentAvatar";
import { AgentStatusDot } from "./AgentStatusDot";
import { ROLE_LABELS } from "@/data/agents";
import type { Agent } from "@/types/agent";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AgentCard({ agent, isSelected, onClick, className }: AgentCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={ref}
      data-kb-selected={isSelected || undefined}
      onClick={onClick}
      className={cn(
        "border-l-2 bg-card p-3",
        isSelected && "bg-secondary/30",
        onClick && "cursor-pointer",
        className,
      )}
      style={{ borderLeftColor: agent.color }}
    >
      <div className="flex items-start gap-3">
        <AgentAvatar agentId={agent.id} color={agent.color} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{agent.name}</span>
            <AgentStatusDot status={agent.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[agent.role]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            "{agent.personality.greeting}"
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {agent.personality.expertise.map((skill) => (
              <span
                key={skill}
                className="text-[10px] text-muted-foreground"
              >
                [{skill}]
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
