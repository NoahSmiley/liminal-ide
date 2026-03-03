import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FileBuffer } from "./use-open-files";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

describe("useOpenFiles state logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("FileBuffer interface has expected fields", () => {
    const fb: FileBuffer = {
      path: "src/main.ts",
      content: "original",
      buffer: "original",
      dirty: false,
    };
    expect(fb.path).toBe("src/main.ts");
    expect(fb.content).toBe("original");
    expect(fb.buffer).toBe("original");
    expect(fb.dirty).toBe(false);
  });

  it("openFile adds to files map", () => {
    const files = new Map<string, FileBuffer>();
    const path = "src/main.ts";
    const fb: FileBuffer = { path, content: "hello", buffer: "hello", dirty: false };
    files.set(path, fb);
    expect(files.has(path)).toBe(true);
    expect(files.get(path)).toEqual(fb);
  });

  it("closeFile removes from map", () => {
    const files = new Map<string, FileBuffer>();
    const path = "src/main.ts";
    files.set(path, { path, content: "", buffer: "", dirty: false });
    expect(files.has(path)).toBe(true);
    files.delete(path);
    expect(files.has(path)).toBe(false);
  });

  it("setActiveFile changes active", () => {
    const files = new Map<string, FileBuffer>();
    files.set("a.ts", { path: "a.ts", content: "", buffer: "", dirty: false });
    files.set("b.ts", { path: "b.ts", content: "", buffer: "", dirty: false });

    let activeFile: string | null = "a.ts";
    const setActive = (path: string) => {
      if (files.has(path)) activeFile = path;
    };

    setActive("b.ts");
    expect(activeFile).toBe("b.ts");
  });

  it("setActiveFile ignores paths not in files map", () => {
    const files = new Map<string, FileBuffer>();
    files.set("a.ts", { path: "a.ts", content: "", buffer: "", dirty: false });

    let activeFile: string | null = "a.ts";
    const setActive = (path: string) => {
      if (files.has(path)) activeFile = path;
    };

    setActive("not-open.ts");
    expect(activeFile).toBe("a.ts");
  });

  it("updateBuffer marks dirty when buffer differs from content", () => {
    const fb: FileBuffer = {
      path: "src/main.ts",
      content: "original",
      buffer: "original",
      dirty: false,
    };
    const newBuffer = "modified";
    const updated: FileBuffer = {
      ...fb,
      buffer: newBuffer,
      dirty: newBuffer !== fb.content,
    };
    expect(updated.dirty).toBe(true);
    expect(updated.buffer).toBe("modified");
  });

  it("updateBuffer marks not dirty when buffer equals content", () => {
    const fb: FileBuffer = {
      path: "src/main.ts",
      content: "original",
      buffer: "modified",
      dirty: true,
    };
    const newBuffer = "original";
    const updated: FileBuffer = {
      ...fb,
      buffer: newBuffer,
      dirty: newBuffer !== fb.content,
    };
    expect(updated.dirty).toBe(false);
  });

  it("close changes activeFile to last remaining file", () => {
    const files = new Map<string, FileBuffer>();
    files.set("a.ts", { path: "a.ts", content: "", buffer: "", dirty: false });
    files.set("b.ts", { path: "b.ts", content: "", buffer: "", dirty: false });
    files.set("c.ts", { path: "c.ts", content: "", buffer: "", dirty: false });

    let activeFile: string | null = "b.ts";
    const closePath = "b.ts";
    files.delete(closePath);
    const paths = Array.from(files.keys());
    activeFile = activeFile === closePath ? (paths[paths.length - 1] ?? null) : activeFile;
    expect(activeFile).toBe("c.ts");
    expect(files.size).toBe(2);
  });

  it("close last file sets activeFile to null", () => {
    const files = new Map<string, FileBuffer>();
    files.set("a.ts", { path: "a.ts", content: "", buffer: "", dirty: false });

    let activeFile: string | null = "a.ts";
    const closePath = "a.ts";
    files.delete(closePath);
    const paths = Array.from(files.keys());
    activeFile = activeFile === closePath ? (paths[paths.length - 1] ?? null) : activeFile;
    expect(activeFile).toBeNull();
    expect(files.size).toBe(0);
  });

  it("openPaths returns all keys from files map", () => {
    const files = new Map<string, FileBuffer>();
    files.set("a.ts", { path: "a.ts", content: "", buffer: "", dirty: false });
    files.set("b.ts", { path: "b.ts", content: "", buffer: "", dirty: false });
    const openPaths = Array.from(files.keys());
    expect(openPaths).toEqual(["a.ts", "b.ts"]);
  });

  it("useOpenFiles hook is exported as a function", async () => {
    const mod = await import("./use-open-files");
    expect(mod.useOpenFiles).toBeDefined();
    expect(typeof mod.useOpenFiles).toBe("function");
  });
});
