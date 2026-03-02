import { useAgentStore } from "@/stores/agentStore";

interface AgentSelectorProps {
  value: string; // "team" or agent id
  onChange: (value: string) => void;
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const agents = useAgentStore((s) => s.agents);
  const options = [{ id: "team", name: "team", color: undefined }, ...agents];
  const currentIdx = options.findIndex((o) => o.id === value);

  const cycle = () => {
    const next = (currentIdx + 1) % options.length;
    const opt = options[next];
    if (opt) onChange(opt.id);
  };

  const current = options[currentIdx];
  const display = current?.name.toLowerCase() ?? "team";

  return (
    <button
      onClick={cycle}
      className="text-[10px] text-foreground"
      style={current && "color" in current && current.color ? { color: current.color } : undefined}
    >
      [{display}]
      <span className="text-muted-foreground/30 ml-1">tab</span>
    </button>
  );
}
