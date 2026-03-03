import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SearchResult } from "../types/search-types";

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await invoke<SearchResult[]>("search_project", {
        query: q,
        caseSensitive,
        regex: useRegex,
      });
      setResults(r);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [caseSensitive, useRegex]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    results, loading, query, caseSensitive, useRegex,
    search, clear, setCaseSensitive, setUseRegex,
  };
}
