import { useState, useRef, useEffect, useCallback } from "react";
import { useMentionAutocomplete } from "../../hooks/use-mention-autocomplete";
import { MentionDropdown } from "./mention-dropdown";
import type { AgentTemplate } from "../../types/agent-types";
import { PREMADE_AGENTS, getAgentColors } from "../../types/agent-types";
import { BotFace } from "../shared/bot-face";

interface AgentsHook {
  agents: AgentTemplate[];
  active: AgentTemplate | null;
  activate: (t: AgentTemplate | null) => void;
  save: (t: AgentTemplate) => void;
}

interface InputBarProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
  confirmMode?: boolean;
  queuedCount?: number;
  onStop?: () => void;
  agents?: AgentsHook;
}

// ─── Inline Bot Picker (right side of input) ─────────────────────────────────

function BotPicker({ agents }: { agents: AgentsHook }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const savedIds = new Set(agents.agents.map((a) => a.id));
  const premadeNotSaved = PREMADE_AGENTS.filter((p) => !savedIds.has(p.id));
  const allAgents = [...agents.agents, ...premadeNotSaved];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (agent: AgentTemplate) => {
    if (agents.active?.id === agent.id) {
      setOpen(false);
      return;
    }
    if (!savedIds.has(agent.id)) {
      agents.save(agent);
    }
    agents.activate(agent);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0 flex items-center pr-2">
      <button
        onClick={() => setOpen(!open)}
        className="transition-all hover:scale-105 active:scale-95"
        title={agents.active ? `${agents.active.name} — click to switch` : "select a bot"}
      >
        <BotFace face={agents.active?.avatar ?? "orb"} color={agents.active?.color ?? "cyan"} size={24} active />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-[200px] bg-zinc-900/95 backdrop-blur-sm border border-zinc-800/60 rounded-[8px] shadow-xl shadow-black/50 overflow-hidden z-50">
          <div className="p-1 flex flex-col">
            {allAgents.map((agent) => {
              const isActive = agents.active?.id === agent.id;
              const c = getAgentColors(agent.color);
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelect(agent)}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[5px] text-left transition-all ${
                    isActive
                      ? `${c.bg}`
                      : "hover:bg-zinc-800/40"
                  }`}
                >
                  <BotFace face={agent.avatar} color={agent.color} size={20} active={isActive} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold tracking-wide ${isActive ? c.text : "text-zinc-300"}`}>
                        {agent.name}
                      </span>
                      {agent.role && (
                        <span className="text-[8px] text-zinc-600 uppercase tracking-widest">
                          {agent.role}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <div className={`w-1 h-1 rounded-full animate-pulse ${c.text.replace("text-", "bg-")}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── InputBar ─────────────────────────────────────────────────────────────────

export function InputBar({ onSubmit, disabled, confirmMode, queuedCount = 0, onStop, agents }: InputBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const mention = useMentionAutocomplete();

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    historyRef.current.push(trimmed);
    historyIndexRef.current = -1;
    onSubmit(trimmed);
    setValue("");
  }, [value, onSubmit]);

  const handleMentionSelect = useCallback(
    (suggestion: { path: string }) => {
      const lastAt = value.lastIndexOf("@");
      if (lastAt >= 0) {
        setValue(value.slice(0, lastAt) + `@${suggestion.path} `);
      }
      mention.close();
      inputRef.current?.focus();
    },
    [value, mention],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      const lastAt = v.lastIndexOf("@");
      if (lastAt >= 0 && lastAt < v.length) {
        const partial = v.slice(lastAt + 1);
        if (!partial.includes(" ")) {
          mention.search(partial);
        } else {
          mention.close();
        }
      } else {
        mention.close();
      }
    },
    [mention],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mention.active) {
        if (e.key === "ArrowUp") { e.preventDefault(); mention.moveSelection(-1); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); mention.moveSelection(1); return; }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const selected = mention.suggestions[mention.selectedIndex];
          if (selected) handleMentionSelect(selected);
          return;
        }
        if (e.key === "Escape") { e.preventDefault(); mention.close(); return; }
      }
      if (e.key === "Enter") {
        handleSubmit();
        return;
      }
      const history = historyRef.current;
      if (e.key === "ArrowUp" && history.length > 0) {
        e.preventDefault();
        const idx = historyIndexRef.current === -1
          ? history.length - 1
          : Math.max(0, historyIndexRef.current - 1);
        historyIndexRef.current = idx;
        setValue(history[idx] ?? "");
      }
      if (e.key === "ArrowDown" && historyIndexRef.current >= 0) {
        e.preventDefault();
        const idx = historyIndexRef.current + 1;
        if (idx >= history.length) {
          historyIndexRef.current = -1;
          setValue("");
        } else {
          historyIndexRef.current = idx;
          setValue(history[idx] ?? "");
        }
      }
    },
    [handleSubmit, mention, handleMentionSelect],
  );

  if (confirmMode) {
    return (
      <div data-tutorial="input-bar" className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-3 border border-border/50 rounded-[3px] bg-card/80 shadow-lg shadow-black/50 px-4 py-2.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest shrink-0">confirm</span>
          <div className="flex-1" />
          <button onClick={() => onSubmit("yes")}
            className="px-4 py-1 text-[11px] border border-sky-500/40 text-zinc-300 hover:bg-sky-950/30 hover:border-sky-500/60 active:scale-95 transition-all duration-100 rounded-[3px]">
            yes
          </button>
          <button onClick={() => onSubmit("no")}
            className="px-4 py-1 text-[11px] border border-zinc-800/40 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 active:scale-95 transition-all duration-100 rounded-[3px]">
            no
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="input-bar" className="px-4 pb-4 pt-2">
      <div className="relative w-full border border-border/50 rounded-[3px] bg-card/80 shadow-lg shadow-black/50 focus-within:border-panel-border focus-within:bg-card transition-all">
        {mention.active && (
          <MentionDropdown suggestions={mention.suggestions} selectedIndex={mention.selectedIndex} onSelect={handleMentionSelect} />
        )}
        <div className="flex items-center">
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-zinc-300 text-[11px] px-3 py-2.5 tracking-wide outline-none placeholder:text-zinc-700"
            placeholder={disabled ? (queuedCount > 0 ? `${queuedCount} queued — type to add more` : "thinking — type to queue") : "message liminal"}
            spellCheck={false}
            autoComplete="off"
          />
          {queuedCount > 0 && (
            <span className="text-amber-500/70 text-[10px] pr-2 shrink-0">{queuedCount} queued</span>
          )}
          {disabled && onStop && (
            <button
              onClick={onStop}
              title="stop (esc)"
              className="text-zinc-600 hover:text-red-400 text-[10px] pr-2 shrink-0 transition-colors"
            >
              ■ stop
            </button>
          )}
          {value.length > 0 && (
            <span className="text-zinc-700 text-[12px] pr-1 shrink-0">↵</span>
          )}
          {agents && <BotPicker agents={agents} />}
        </div>
      </div>
    </div>
  );
}
