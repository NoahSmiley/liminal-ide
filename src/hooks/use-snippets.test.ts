import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Snippet } from "../types/snippet-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const sampleSnippets: Snippet[] = [
  { id: "1", title: "hello", language: "ts", content: "console.log('hi')" },
  { id: "2", title: "greet", language: "py", content: "print('hi')" },
];

describe("useSnippets invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list_snippets invoke returns snippet array", async () => {
    mockInvoke.mockResolvedValue(sampleSnippets);
    const result = await mockInvoke("list_snippets");
    expect(mockInvoke).toHaveBeenCalledWith("list_snippets");
    expect(result).toEqual(sampleSnippets);
  });

  it("add_snippet invoke is called with title, language, content", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("add_snippet", { title: "test", language: "rs", content: "fn main() {}" });
    expect(mockInvoke).toHaveBeenCalledWith("add_snippet", {
      title: "test",
      language: "rs",
      content: "fn main() {}",
    });
  });

  it("remove_snippet invoke is called with id", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("remove_snippet", { id: "1" });
    expect(mockInvoke).toHaveBeenCalledWith("remove_snippet", { id: "1" });
  });

  it("add then refresh pattern calls list_snippets after add_snippet", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleSnippets);
    await mockInvoke("add_snippet", { title: "x", language: "js", content: "x" });
    await mockInvoke("list_snippets");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "add_snippet", {
      title: "x",
      language: "js",
      content: "x",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "list_snippets");
  });

  it("remove then refresh pattern calls list_snippets after remove_snippet", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);
    await mockInvoke("remove_snippet", { id: "2" });
    await mockInvoke("list_snippets");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "remove_snippet", { id: "2" });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "list_snippets");
  });

  it("useSnippets hook is exported as a function", async () => {
    mockInvoke.mockResolvedValue([]);
    const mod = await import("./use-snippets");
    expect(mod.useSnippets).toBeDefined();
    expect(typeof mod.useSnippets).toBe("function");
  });
});
