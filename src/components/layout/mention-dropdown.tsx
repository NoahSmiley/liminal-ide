interface MentionSuggestion {
  path: string;
  name: string;
}

interface MentionDropdownProps {
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
}

export function MentionDropdown({ suggestions, selectedIndex, onSelect }: MentionDropdownProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 w-full mb-1 bg-zinc-900 border border-zinc-700 max-h-[200px] overflow-y-auto z-50">
      {suggestions.map((s, i) => (
        <button
          key={s.path}
          onClick={() => onSelect(s)}
          className={`block w-full text-left px-3 py-1 text-[11px] ${
            i === selectedIndex
              ? "bg-zinc-800 text-zinc-200"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
          }`}
        >
          <span className="text-cyan-500">@</span>
          <span>{s.name}</span>
          <span className="ml-2 text-zinc-700 text-[9px]">{s.path}</span>
        </button>
      ))}
    </div>
  );
}
