import { useState } from "react";
import type { AgentTemplate } from "../../types/agent-types";

interface AgentPanelProps {
  agents: AgentTemplate[];
  active: AgentTemplate | null;
  onActivate: (template: AgentTemplate | null) => void;
  onSave: (template: AgentTemplate) => void;
  onRemove: (id: string) => void;
}

export function AgentPanel({ agents, active, onActivate, onSave, onRemove }: AgentPanelProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = name.trim().toLowerCase().replace(/\s+/g, "-");
    onSave({
      id,
      name: name.trim(),
      description: description.trim(),
      system_prompt: systemPrompt.trim(),
      model: model.trim() || undefined,
    });
    setCreating(false);
    setName("");
    setDescription("");
    setSystemPrompt("");
    setModel("");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">agents</span>
        <button
          onClick={() => setCreating(!creating)}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {creating ? "cancel" : "+ new"}
        </button>
      </div>

      {creating && (
        <div className="px-3 py-2 border-b border-border/30 flex flex-col gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name"
            className="bg-zinc-900/60 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[2px] outline-none border border-border/30 focus:border-zinc-600"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="description"
            className="bg-zinc-900/60 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[2px] outline-none border border-border/30 focus:border-zinc-600"
          />
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="system prompt"
            rows={3}
            className="bg-zinc-900/60 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[2px] outline-none border border-border/30 focus:border-zinc-600 resize-none"
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="model override (optional)"
            className="bg-zinc-900/60 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[2px] outline-none border border-border/30 focus:border-zinc-600"
          />
          <button
            onClick={handleCreate}
            className="text-[10px] text-zinc-400 border border-border/40 rounded-[2px] px-2 py-1 hover:bg-white/[0.03] transition-colors self-end"
          >
            save
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Clear active agent option */}
        {active && (
          <button
            onClick={() => onActivate(null)}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-[11px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02] transition-colors border-b border-border/20"
          >
            <span className="text-[10px]">×</span>
            <span>clear active agent</span>
          </button>
        )}

        {agents.map((agent) => {
          const isActive = active?.id === agent.id;
          return (
            <div
              key={agent.id}
              className={`px-3 py-2 border-b border-border/20 ${isActive ? "bg-cyan-500/5" : ""}`}
            >
              <div className="flex items-center gap-2">
                {isActive && <span className="text-cyan-500/70 text-[8px]">●</span>}
                <span className={`text-[11px] ${isActive ? "text-cyan-400/80" : "text-zinc-400"}`}>
                  {agent.name}
                </span>
                {agent.model && (
                  <span className="text-[9px] text-zinc-700 ml-auto">{agent.model}</span>
                )}
              </div>
              {agent.description && (
                <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{agent.description}</div>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => onActivate(isActive ? null : agent)}
                  className={`text-[10px] transition-colors ${
                    isActive
                      ? "text-cyan-500/70 hover:text-cyan-400"
                      : "text-zinc-700 hover:text-zinc-400"
                  }`}
                >
                  {isActive ? "active" : "use"}
                </button>
                <button
                  onClick={() => onRemove(agent.id)}
                  className="text-[10px] text-zinc-700 hover:text-red-400/70 transition-colors"
                >
                  delete
                </button>
              </div>
            </div>
          );
        })}

        {agents.length === 0 && !creating && (
          <div className="px-3 py-4 text-zinc-700 text-[11px]">
            no agent templates — click + new or add .json files to .claude/agents/
          </div>
        )}
      </div>
    </div>
  );
}
