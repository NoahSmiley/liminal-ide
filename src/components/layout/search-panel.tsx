import { useCallback, useRef, useEffect } from "react";
import { TuiPanel } from "../shared/tui-panel";
import type { SearchResult } from "../../types/search-types";

interface SearchPanelProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  caseSensitive: boolean;
  useRegex: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
  onToggleCase: () => void;
  onToggleRegex: () => void;
  onOpenFileAt: (path: string, line: number) => void;
  onClose: () => void;
}

export function SearchPanel({
  results, loading, query, caseSensitive, useRegex,
  onSearch, onClear, onToggleCase, onToggleRegex, onOpenFileAt, onClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 200);
  }, [onSearch]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <TuiPanel
      title="search"
      className="mx-3 mb-2 max-h-[50vh] flex flex-col"
      dataTutorial="search-panel"
      actions={
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[11px]">esc</button>
      }
    >
      <div className="flex items-center gap-1 mb-2">
        <input
          ref={inputRef}
          type="text"
          defaultValue={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="search..."
          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] px-2 py-1 outline-none"
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        />
        <button
          onClick={onToggleCase}
          className={`text-[10px] px-1 ${caseSensitive ? "text-cyan-400" : "text-zinc-600"}`}
          title="case sensitive"
        >
          Aa
        </button>
        <button
          onClick={onToggleRegex}
          className={`text-[10px] px-1 ${useRegex ? "text-cyan-400" : "text-zinc-600"}`}
          title="regex"
        >
          .*
        </button>
        {query && (
          <button onClick={onClear} className="text-zinc-600 hover:text-zinc-400 text-[10px] px-1">
            clear
          </button>
        )}
      </div>
      {loading && <div className="text-[10px] text-zinc-600">searching...</div>}
      {!loading && query && (
        <div className="text-[10px] text-zinc-600 mb-1">
          {totalMatches} match{totalMatches !== 1 ? "es" : ""} in {results.length} file{results.length !== 1 ? "s" : ""}
        </div>
      )}
      <div className="overflow-y-auto flex-1 min-h-0">
        {results.map((result) => (
          <div key={result.path} className="mb-2">
            <div className="text-[10px] text-zinc-400 truncate">{result.path}</div>
            {result.matches.map((m) => (
              <button
                key={`${result.path}:${m.line_number}`}
                onClick={() => onOpenFileAt(result.path, m.line_number)}
                className="block w-full text-left text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 px-2 py-0.5 truncate"
              >
                <span className="text-zinc-700 mr-1">{m.line_number}</span>
                {m.line_content.trim()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </TuiPanel>
  );
}
