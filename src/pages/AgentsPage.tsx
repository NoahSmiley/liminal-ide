import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AgentCard } from "@/components/agents/AgentCard";
import { useAgentStore } from "@/stores/agentStore";
import { useAgentsKeyboard } from "@/hooks/useAgentsKeyboard";
import { TuiPanel } from "@/components/shared/TuiPanel";

export function AgentsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const agents = useAgentStore((s) => s.agents);

  const handleSelect = useCallback(
    (index: number) => {
      const agent = agents[index];
      if (agent && projectId) {
        navigate(`/project/${projectId}/chat/${agent.id}`);
      }
    },
    [agents, projectId, navigate],
  );

  const { selectedIndex } = useAgentsKeyboard({
    agentCount: agents.length,
    onSelect: handleSelect,
  });

  return (
    <div className="flex h-full flex-col p-1">
      <div className="px-1 pb-1">
        <span className="text-[10px] text-muted-foreground">
          AGENTS{" "}
          <span className="text-foreground">[{agents.length}]</span>
          <span className="text-muted-foreground/30 ml-2">
            [j/k]nav [enter]chat
          </span>
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 p-0.5">
          {agents.map((agent, idx) => (
            <TuiPanel key={agent.id} title={agent.name.toLowerCase()} accent={agent.color}>
              <AgentCard
                agent={agent}
                isSelected={idx === selectedIndex}
                onClick={() => handleSelect(idx)}
                className="border-l-0 p-0 bg-transparent"
              />
            </TuiPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
