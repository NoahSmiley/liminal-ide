import { useState, useRef, useEffect, useCallback } from "react";
import type { Skill } from "../../types/skill-types";

interface SkillPaletteProps {
  skills: Skill[];
  onSelect: (skill: Skill) => void;
  onClose: () => void;
}

export function SkillPalette({ skills, onSelect, onClose }: SkillPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = skills.filter((s) => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback((skill: Skill) => {
    onSelect(skill);
    onClose();
  }, [onSelect, onClose]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[selectedIdx]) { handleSelect(filtered[selectedIdx]); }
  }, [filtered, selectedIdx, onClose, handleSelect]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-zinc-200 outline-none placeholder-zinc-700 text-[13px]"
            placeholder="search skills..."
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((skill, i) => (
            <button
              key={skill.id}
              onClick={() => handleSelect(skill)}
              className={`flex flex-col w-full px-3 py-2 text-left transition-colors ${
                i === selectedIdx ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px]">{skill.name}</span>
                <span className="text-[10px] text-zinc-700">{skill.source}</span>
              </div>
              <span className="text-[11px] text-zinc-600 truncate">{skill.description}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-zinc-700 text-[13px]">
              {skills.length === 0 ? "no skills found — add SKILL.md files to .claude/skills/" : "no matching skills"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
