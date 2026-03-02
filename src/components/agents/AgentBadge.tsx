import { AgentAvatar } from "./AgentAvatar";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types/agent";

interface AgentBadgeProps {
  agent: Agent;
  showStatus?: boolean;
  className?: string;
}

export function AgentBadge({ agent, className }: AgentBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <AgentAvatar agentId={agent.id} color={agent.color} size="sm" />
      <span className="text-sm font-medium" style={{ color: agent.color }}>
        {agent.name}
      </span>
    </span>
  );
}
