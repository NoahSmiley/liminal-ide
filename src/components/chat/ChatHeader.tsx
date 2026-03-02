import { useEffect } from "react";
import { AgentSelector } from "@/components/agents/AgentSelector";
import { AgentStatusDot } from "@/components/agents/AgentStatusDot";
import { useAgentStore } from "@/stores/agentStore";
import type { ChatTarget } from "@/types/chat";

interface ChatHeaderProps {
  target: ChatTarget;
  onTargetChange: (target: ChatTarget) => void;
}

export function ChatHeader({ target, onTargetChange }: ChatHeaderProps) {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = target.type === "agent"
    ? agents.find((a) => a.id === target.agentId)
    : null;

  const handleChange = (value: string) => {
    if (value === "team") {
      onTargetChange({ type: "team" });
    } else {
      onTargetChange({ type: "agent", agentId: value });
    }
  };

  // Listen for keyboard-triggered agent cycling
  useEffect(() => {
    const handler = () => {
      const options = ["team", ...agents.map((a) => a.id)];
      const currentValue = target.type === "team" ? "team" : target.agentId;
      const currentIdx = options.indexOf(currentValue);
      const next = (currentIdx + 1) % options.length;
      handleChange(options[next]!);
    };
    document.addEventListener("liminal:cycle-agent", handler);
    return () => document.removeEventListener("liminal:cycle-agent", handler);
  });

  return (
    <div className="flex items-center gap-2 border-b border-panel-border px-2 py-1">
      <span className="text-[10px] text-muted-foreground">CHAT</span>
      <span className="text-[10px] text-muted-foreground">&rarr;</span>
      <span className="text-[10px] text-foreground">
        {selectedAgent ? (
          <span style={{ color: selectedAgent.color }}>
            {selectedAgent.name.toLowerCase()}
          </span>
        ) : (
          "team"
        )}
      </span>
      {selectedAgent && <AgentStatusDot status={selectedAgent.status} />}
      {!selectedAgent && (
        <span className="text-[10px] text-muted-foreground">
          ({agents.filter((a) => a.status !== "offline").length} online)
        </span>
      )}
      <div className="ml-auto">
        <AgentSelector
          value={target.type === "team" ? "team" : target.agentId}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
