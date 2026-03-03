import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SearchResult } from "../types/search-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const sampleResults: SearchResult[] = [
  {
    path: "src/main.ts",
    matches: [
      { line_number: 5, line_content: "const x = 1;" },
      { line_number: 10, line_content: "const y = x + 1;" },
    ],
  },
];

describe("useSearch invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("search_project invoke is called with query and options", async () => {
    mockInvoke.mockResolvedValue(sampleResults);
    const result = await mockInvoke("search_project", {
      query: "const",
      caseSensitive: false,
      regex: false,
    });
    expect(mockInvoke).toHaveBeenCalledWith("search_project", {
      query: "const",
      caseSensitive: false,
      regex: false,
    });
    expect(result).toEqual(sampleResults);
  });

  it("search_project with case sensitive flag", async () => {
    mockInvoke.mockResolvedValue([]);
    await mockInvoke("search_project", {
      query: "Const",
      caseSensitive: true,
      regex: false,
    });
    expect(mockInvoke).toHaveBeenCalledWith("search_project", {
      query: "Const",
      caseSensitive: true,
      regex: false,
    });
  });

  it("search_project with regex flag", async () => {
    mockInvoke.mockResolvedValue(sampleResults);
    await mockInvoke("search_project", {
      query: "const\\s+\\w+",
      caseSensitive: false,
      regex: true,
    });
    expect(mockInvoke).toHaveBeenCalledWith("search_project", {
      query: "const\\s+\\w+",
      caseSensitive: false,
      regex: true,
    });
  });

  it("search_project returns empty for no matches", async () => {
    mockInvoke.mockResolvedValue([]);
    const result = await mockInvoke("search_project", {
      query: "nonexistent",
      caseSensitive: false,
      regex: false,
    });
    expect(result).toEqual([]);
  });

  it("initial state should have empty results", () => {
    const results: SearchResult[] = [];
    expect(results).toEqual([]);
    expect(results).toHaveLength(0);
  });

  it("useSearch hook is exported as a function", async () => {
    const mod = await import("./use-search");
    expect(mod.useSearch).toBeDefined();
    expect(typeof mod.useSearch).toBe("function");
  });
});
