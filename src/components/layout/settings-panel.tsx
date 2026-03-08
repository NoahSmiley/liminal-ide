import { useState } from "react";
import type { Settings } from "../../types/settings-types";
import type { AgentTemplate } from "../../types/agent-types";
import { BOT_FACE_IDS, COLOR_OPTIONS, PREMADE_AGENTS, getAgentColors } from "../../types/agent-types";
import { BotFace } from "../shared/bot-face";
import type { Skill } from "../../types/skill-types";
import {
  MODEL_OPTIONS,
  THEME_OPTIONS,
  KEYBINDING_OPTIONS,
  PERMISSION_MODE_OPTIONS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "../../types/settings-types";
import type { PermissionMode } from "../../types/settings-types";
import { PersonalitySliders } from "./personality-sliders";

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (partial: Partial<Settings>) => void;
  onReset: () => void;
  agents?: { agents: AgentTemplate[]; active: AgentTemplate | null; activate: (t: AgentTemplate | null) => void; save: (t: AgentTemplate) => void; remove: (id: string) => void; refresh: () => void };
  skills?: { skills: Skill[]; refresh: () => void };
}

// ─── Shared field components ──────────────────────────────────────────────────

function SectionHeader({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 select-none">
      <div className="text-[10px] text-zinc-600 uppercase tracking-[0.1em]">{children}</div>
      {right}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] text-zinc-500 uppercase tracking-[0.1em] mb-1 select-none">
      {children}
    </div>
  );
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] px-2 py-[5px] outline-none rounded-[2px] focus:border-zinc-600 hover:border-zinc-700 transition-colors cursor-pointer appearance-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

const divider = "border-t border-zinc-800/50 mx-2 my-3";

// ─── Agent Templates Section ────────────────────────────────────────────────

function BotCard({
  agent,
  isActive,
  onActivate,
  onRemove,
  isPremade,
}: {
  agent: AgentTemplate;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  isPremade?: boolean;
}) {
  const c = getAgentColors(agent.color);
  return (
    <button
      onClick={onActivate}
      className={`group relative flex items-center gap-2.5 rounded-[6px] border px-2.5 py-2 text-left transition-all w-full ${
        isActive
          ? `${c.border} ${c.bg} shadow-md ${c.glow}`
          : "border-zinc-800/40 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-900/40"
      }`}
    >
      <BotFace face={agent.avatar} color={agent.color} size={28} active={isActive} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold tracking-wide ${isActive ? c.text : "text-zinc-300"}`}>
            {agent.name}
          </span>
          {agent.role && (
            <span className={`text-[8px] px-1.5 py-[1px] rounded-[3px] uppercase tracking-widest ${
              isActive ? `${c.bg} ${c.text}` : "bg-zinc-800/40 text-zinc-600"
            }`}>
              {agent.role}
            </span>
          )}
          {agent.model && (
            <span className="text-[8px] text-zinc-700 font-mono ml-auto">{agent.model}</span>
          )}
        </div>
        <div className="text-[9px] text-zinc-600 mt-0.5 leading-relaxed line-clamp-1">{agent.description}</div>
      </div>
      {isActive && (
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${c.text.replace("text-", "bg-")}`} />
      )}
      {!isPremade && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 text-[9px] text-zinc-800 hover:text-red-400/70 transition-colors opacity-0 group-hover:opacity-100"
          title="delete"
        >
          ×
        </button>
      )}
    </button>
  );
}

function NewAgentForm({ onSave }: { onSave: (t: AgentTemplate) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [avatar, setAvatar] = useState<string>(BOT_FACE_IDS[0]);
  const [color, setColor] = useState<string>("cyan");
  const [role, setRole] = useState("");

  const reset = () => { setName(""); setDesc(""); setPrompt(""); setModel(""); setRole(""); setAvatar(BOT_FACE_IDS[0]); setColor("cyan"); setOpen(false); };
  const submit = () => {
    if (!name.trim() || !prompt.trim()) return;
    onSave({
      id: name.trim().toLowerCase().replace(/\s+/g, "-"),
      name: name.trim().toUpperCase(),
      description: desc.trim(),
      system_prompt: prompt.trim(),
      model: model.trim() || undefined,
      avatar,
      color,
      role: role.trim() || undefined,
    });
    reset();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-[5px] border border-dashed border-zinc-800/40 py-2.5 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all text-center"
      >
        + build your own bot
      </button>
    );
  }

  const c = getAgentColors(color);

  return (
    <div className={`rounded-[6px] border ${c.border} ${c.bg} p-3 flex flex-col gap-2`}>
      {/* Face picker + color picker */}
      <div className="flex items-center gap-3">
        <BotFace face={avatar} color={color} size={40} />
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {BOT_FACE_IDS.map((fid) => (
              <button key={fid} onClick={() => setAvatar(fid)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  fid === avatar ? `${c.bg} ${c.border} border` : "hover:bg-white/[0.03] border border-transparent"
                }`}>
                <BotFace face={fid} color={fid === avatar ? color : undefined} size={18} />
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {COLOR_OPTIONS.map((co) => {
              const cc = getAgentColors(co.value);
              return (
                <button key={co.value} onClick={() => setColor(co.value)}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    co.value === color ? `${cc.border} ${cc.bg} scale-110` : "border-zinc-800/50 bg-zinc-900/50 hover:scale-105"
                  }`}
                  title={co.name}>
                  <span className={`block w-2 h-2 rounded-full mx-auto ${cc.text.replace("text-", "bg-")}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="bot name"
          className="flex-1 bg-black/20 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[3px] outline-none border border-zinc-800/40 focus:border-zinc-600 placeholder:text-zinc-700 uppercase tracking-wide font-semibold" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="bg-black/20 text-zinc-400 text-[11px] px-2 py-1.5 rounded-[3px] outline-none border border-zinc-800/40 focus:border-zinc-600 appearance-none cursor-pointer">
          <option value="">role</option>
          <option value="plan">plan</option>
          <option value="build">build</option>
          <option value="test">test</option>
          <option value="review">review</option>
          <option value="debug">debug</option>
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)}
          className="bg-black/20 text-zinc-400 text-[11px] px-2 py-1.5 rounded-[3px] outline-none border border-zinc-800/40 focus:border-zinc-600 appearance-none cursor-pointer">
          <option value="">model</option>
          {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="one-liner personality"
        className="bg-black/20 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[3px] outline-none border border-zinc-800/40 focus:border-zinc-600 placeholder:text-zinc-700" />
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="system prompt — give your bot instructions"
        rows={3}
        className="bg-black/20 text-zinc-300 text-[11px] px-2 py-1.5 rounded-[3px] outline-none border border-zinc-800/40 focus:border-zinc-600 placeholder:text-zinc-700 resize-none leading-relaxed" />
      <div className="flex items-center gap-2 justify-end">
        <button onClick={reset} className="text-[10px] text-zinc-600 hover:text-zinc-400 px-2 py-1 transition-colors">cancel</button>
        <button onClick={submit}
          className={`text-[10px] ${c.text} ${c.bg} hover:brightness-125 border ${c.border} px-3 py-1 rounded-[3px] transition-all`}>
          save
        </button>
      </div>
    </div>
  );
}

function AgentTemplatesSection({ agents }: { agents: NonNullable<SettingsPanelProps["agents"]> }) {
  const savedIds = new Set(agents.agents.map((a) => a.id));
  const premadeNotSaved = PREMADE_AGENTS.filter((p) => !savedIds.has(p.id));
  const allAgents = [...agents.agents, ...premadeNotSaved];

  const handleActivate = (agent: AgentTemplate) => {
    if (agents.active?.id === agent.id) return;
    if (!savedIds.has(agent.id)) {
      agents.save(agent);
    }
    agents.activate(agent);
  };

  const activeAgent = agents.active;
  const activeC = activeAgent ? getAgentColors(activeAgent.color) : null;

  return (
    <div className="px-2 pb-1">
      <SectionHeader>bots</SectionHeader>

      {/* Active bot indicator */}
      {activeAgent && activeC && (
        <div className={`mb-2.5 rounded-[6px] border ${activeC.border} ${activeC.bg} px-3 py-2 flex items-center gap-2.5`}>
          <BotFace face={activeAgent.avatar} color={activeAgent.color} size={22} active />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-semibold tracking-wide ${activeC.text}`}>{activeAgent.name}</span>
              <span className={`text-[8px] ${activeC.text} uppercase tracking-widest`}>active</span>
            </div>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeC.text.replace("text-", "bg-")}`} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {allAgents.map((agent) => (
          <BotCard
            key={agent.id}
            agent={agent}
            isActive={agents.active?.id === agent.id}
            onActivate={() => handleActivate(agent)}
            onRemove={() => agents.remove(agent.id)}
            isPremade={PREMADE_AGENTS.some((p) => p.id === agent.id)}
          />
        ))}
        <NewAgentForm onSave={agents.save} />
      </div>
    </div>
  );
}

// ─── Skills Section ─────────────────────────────────────────────────────────

function SkillsSection({ skills }: { skills: NonNullable<SettingsPanelProps["skills"]> }) {
  return (
    <div className="px-2 pb-1">
      <SectionHeader
        right={
          <button onClick={skills.refresh}
            className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors">
            refresh
          </button>
        }
      >
        skills
      </SectionHeader>
      {skills.skills.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {skills.skills.map((skill) => (
            <div key={skill.id}
              className="flex items-center gap-2 rounded-[4px] border border-zinc-800/60 bg-zinc-900/40 px-3 py-2 hover:border-zinc-700/60 transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-300">{skill.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-sm ${
                    skill.source === "project" ? "bg-cyan-500/10 text-cyan-500/60" : "bg-zinc-800/60 text-zinc-600"
                  }`}>
                    {skill.source}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{skill.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[4px] border border-dashed border-zinc-800/50 px-3 py-4 text-center">
          <div className="text-[10px] text-zinc-600 mb-1">no skills found</div>
          <div className="text-[10px] text-zinc-700 leading-relaxed">
            add <span className="text-zinc-600 font-mono">SKILL.md</span> files to <span className="text-zinc-600 font-mono">.claude/skills/</span> to create skills.
            <br />
            open with <span className="text-zinc-500 font-mono">Cmd+Shift+K</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function SettingsPanel({ settings, onUpdate, onReset, agents, skills }: SettingsPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto" data-tutorial="settings-panel">
      {/* Section: Editor */}
      <div className="px-2 pt-3 pb-1">
        <SectionHeader>editor</SectionHeader>
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>model</FieldLabel>
            <SelectField
              value={settings.model}
              options={MODEL_OPTIONS}
              onChange={(v) => onUpdate({ model: v })}
            />
          </div>

          <div>
            <FieldLabel>permissions</FieldLabel>
            <div className="flex flex-col gap-1">
              {PERMISSION_MODE_OPTIONS.map((opt) => {
                const isActive = settings.permission_mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ permission_mode: opt.value as PermissionMode })}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-left transition-all ${
                      isActive
                        ? "bg-cyan-500/10 border border-cyan-500/30"
                        : "border border-transparent hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isActive ? "bg-cyan-400" : "bg-zinc-700"
                    }`} />
                    <div>
                      <div className={`text-[11px] ${isActive ? "text-cyan-400" : "text-zinc-400"}`}>{opt.label}</div>
                      <div className="text-[9px] text-zinc-600 leading-tight">{opt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel>font size</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                value={settings.font_size}
                onChange={(e) => onUpdate({ font_size: Number(e.target.value) })}
                className="flex-1 h-[3px] accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-400 w-5 text-right tabular-nums shrink-0">
                {settings.font_size}
              </span>
            </div>
          </div>

          <div>
            <FieldLabel>keybindings</FieldLabel>
            <SelectField
              value={settings.keybinding_preset}
              options={KEYBINDING_OPTIONS}
              onChange={(v) => onUpdate({ keybinding_preset: v })}
            />
          </div>
        </div>
      </div>

      <div className={divider} />

      {/* Section: Appearance */}
      <div className="px-2 pb-1">
        <SectionHeader>appearance</SectionHeader>
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>theme</FieldLabel>
            <SelectField
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(v) => onUpdate({ theme: v })}
            />
          </div>
        </div>
      </div>

      <div className={divider} />

      {/* Section: Personality */}
      <div className="px-2 pb-1">
        <SectionHeader>personality</SectionHeader>
        <PersonalitySliders
          personality={settings.personality}
          onChange={(p) => onUpdate({ personality: p })}
        />
      </div>

      <div className={divider} />

      {/* Section: Agent Templates */}
      {agents && <AgentTemplatesSection agents={agents} />}
      {agents && <div className={divider} />}

      {/* Section: Skills */}
      {skills && <SkillsSection skills={skills} />}
      {skills && <div className={divider} />}

      {/* Reset */}
      <div className="px-2 pb-3">
        <button
          onClick={onReset}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.1em]"
        >
          reset to defaults
        </button>
      </div>
    </div>
  );
}
