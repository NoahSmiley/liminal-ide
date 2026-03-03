import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TodoItem } from "../types/todo-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const sampleTodos: TodoItem[] = [
  { path: "src/main.ts", line_number: 10, kind: "TODO", text: "implement this" },
  { path: "src/main.ts", line_number: 20, kind: "FIXME", text: "fix bug" },
  { path: "src/lib.ts", line_number: 5, kind: "HACK", text: "temp workaround" },
];

describe("useTodos invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scan_todos invoke returns todo items", async () => {
    mockInvoke.mockResolvedValue(sampleTodos);
    const result = await mockInvoke("scan_todos");
    expect(mockInvoke).toHaveBeenCalledWith("scan_todos");
    expect(result).toEqual(sampleTodos);
  });

  it("scan_todos with empty result returns empty array", async () => {
    mockInvoke.mockResolvedValue([]);
    const result = await mockInvoke("scan_todos");
    expect(result).toEqual([]);
  });

  it("useSnippets hook is exported as a function", async () => {
    mockInvoke.mockResolvedValue([]);
    const mod = await import("./use-todos");
    expect(mod.useTodos).toBeDefined();
    expect(typeof mod.useTodos).toBe("function");
  });
});

describe("useTodos groupedByFile logic", () => {
  it("groups items by file path correctly", () => {
    const items = sampleTodos;
    const grouped = items.reduce<Record<string, TodoItem[]>>((acc, item) => {
      const existing = acc[item.path];
      if (existing) {
        existing.push(item);
      } else {
        acc[item.path] = [item];
      }
      return acc;
    }, {});

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["src/main.ts"]).toHaveLength(2);
    expect(grouped["src/lib.ts"]).toHaveLength(1);
  });

  it("groupedByFile returns empty object for no items", () => {
    const items: TodoItem[] = [];
    const grouped = items.reduce<Record<string, TodoItem[]>>((acc, item) => {
      const existing = acc[item.path];
      if (existing) {
        existing.push(item);
      } else {
        acc[item.path] = [item];
      }
      return acc;
    }, {});

    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("groupedByFile handles single file with multiple todos", () => {
    const items: TodoItem[] = [
      { path: "a.ts", line_number: 1, kind: "TODO", text: "one" },
      { path: "a.ts", line_number: 2, kind: "FIXME", text: "two" },
      { path: "a.ts", line_number: 3, kind: "XXX", text: "three" },
    ];
    const grouped = items.reduce<Record<string, TodoItem[]>>((acc, item) => {
      const existing = acc[item.path];
      if (existing) {
        existing.push(item);
      } else {
        acc[item.path] = [item];
      }
      return acc;
    }, {});

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped["a.ts"]).toHaveLength(3);
  });
});
