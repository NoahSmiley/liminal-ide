import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types/agent";

interface AgentStatusDotProps {
  status: AgentStatus;
  className?: string;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: "IDLE", color: "text-zinc-500" },
  working: { label: "WORKING", color: "text-emerald-500" },
  reviewing: { label: "REVIEW", color: "text-amber-500" },
  offline: { label: "OFFLINE", color: "text-zinc-700" },
};

export function AgentStatusDot({ status, className }: AgentStatusDotProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "text-xs font-medium tracking-wider",
        config.color,
        status === "working" && "animate-pulse",
        className,
      )}
    >
      [{config.label}]
    </span>
  );
}
