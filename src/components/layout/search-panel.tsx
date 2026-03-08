import { useCallback, useRef, useEffect, useState } from "react";
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

function FileResult({
  result,
  onOpenFileAt,
}: {
  result: SearchResult;
  onOpenFileAt: (path: string, line: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const fileName = result.path.split("/").pop() ?? result.path;
  const dirPath = result.path.slice(0, result.path.length - fileName.length).replace(/\/$/, "");

  return (
    <div>
      {/* File header row */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center w-full text-left h-[22px] px-2 hover:bg-white/[0.04] group select-none"
      >
        <span className="text-[10px] text-zinc-500 mr-1 w-2.5 shrink-0 leading-none">
          {collapsed ? "▸" : "▾"}
        </span>
        <span className="text-[11px] text-zinc-300 truncate font-medium">{fileName}</span>
        {dirPath && (
          <span className="text-[10px] text-zinc-600 ml-1 truncate flex-1 text-left">{dirPath}</span>
        )}
        <span className="text-[10px] text-zinc-600 shrink-0 ml-1">{result.matches.length}</span>
      </button>

      {/* Match rows */}
      {!collapsed &&
        result.matches.map((m) => (
          <button
            key={`${result.path}:${m.line_number}`}
            onClick={() => onOpenFileAt(result.path, m.line_number)}
            className="flex items-baseline w-full text-left h-[22px] pl-6 pr-2 hover:bg-white/[0.04] group"
          >
            <span className="text-[10px] text-zinc-600 shrink-0 w-7 text-right mr-2 tabular-nums">
              {m.line_number}
            </span>
            <span className="text-[10px] text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">
              {m.line_content.trim()}
            </span>
          </button>
        ))}
    </div>
  );
}

export function SearchPanel({
  results,
  loading,
  query,
  caseSensitive,
  useRegex,
  onSearch,
  onClear,
  onToggleCase,
  onToggleRegex,
  onOpenFileAt,
  onClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(value), 200);
    },
    [onSearch],
  );

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="flex flex-col h-full" data-tutorial="search-panel">
      {/* Search input bar — flush, no padding box */}
      <div className="flex items-center gap-0 px-2 py-1.5 border-b border-zinc-800/50">
        <input
          ref={inputRef}
          type="text"
          defaultValue={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="search"
          className="flex-1 min-w-0 bg-transparent text-zinc-300 text-[11px] outline-none placeholder:text-zinc-600 caret-cyan-400"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex items-center gap-0.5 ml-1 shrink-0">
          <button
            onClick={onToggleCase}
            title="match case"
            className={`w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors ${
              caseSensitive
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            Aa
          </button>
          <button
            onClick={onToggleRegex}
            title="use regular expression"
            className={`w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] font-mono transition-colors ${
              useRegex
                ? "bg-cyan-500/20 text-cyan-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
            }`}
          >
            .*
          </button>
          {query && (
            <button
              onClick={onClear}
              title="clear"
              className="w-5 h-5 flex items-center justify-center rounded-[2px] text-[10px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Status line */}
      {(loading || (query && results.length > 0)) && (
        <div className="px-2 py-[3px] text-[10px] text-zinc-600 border-b border-zinc-800/30 select-none">
          {loading
            ? "searching..."
            : `${totalMatches} result${totalMatches !== 1 ? "s" : ""} in ${results.length} file${results.length !== 1 ? "s" : ""}`}
        </div>
      )}

      {/* Results tree */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {query && !loading && results.length === 0 && (
          <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">no results</div>
        )}
        {results.map((result) => (
          <FileResult key={result.path} result={result} onOpenFileAt={onOpenFileAt} />
        ))}
      </div>
    </div>
  );
}
