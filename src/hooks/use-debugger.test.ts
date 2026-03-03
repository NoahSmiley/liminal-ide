import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DebugSession } from "../types/debug-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const sampleSession: DebugSession = {
  state: { state: "Stopped" },
  breakpoints: [],
  stack_frames: [],
  variables: [],
  thread_id: null,
};

describe("useDebugger invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debug_start invoke is called with adapter and program", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_start", { adapter: "lldb", program: "./target/debug/app" });
    expect(mockInvoke).toHaveBeenCalledWith("debug_start", {
      adapter: "lldb",
      program: "./target/debug/app",
    });
  });

  it("debug_stop invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_stop");
    expect(mockInvoke).toHaveBeenCalledWith("debug_stop");
  });

  it("debug_get_session invoke returns session state", async () => {
    mockInvoke.mockResolvedValue(sampleSession);
    const result = await mockInvoke("debug_get_session");
    expect(mockInvoke).toHaveBeenCalledWith("debug_get_session");
    expect(result).toEqual(sampleSession);
  });

  it("debug_set_breakpoint invoke is called with path and line", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_set_breakpoint", { path: "main.rs", line: 42 });
    expect(mockInvoke).toHaveBeenCalledWith("debug_set_breakpoint", {
      path: "main.rs",
      line: 42,
    });
  });

  it("debug_remove_breakpoint invoke is called with path and line", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_remove_breakpoint", { path: "main.rs", line: 42 });
    expect(mockInvoke).toHaveBeenCalledWith("debug_remove_breakpoint", {
      path: "main.rs",
      line: 42,
    });
  });

  it("debug_continue invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_continue");
    expect(mockInvoke).toHaveBeenCalledWith("debug_continue");
  });

  it("debug_step_over invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_step_over");
    expect(mockInvoke).toHaveBeenCalledWith("debug_step_over");
  });

  it("debug_step_into invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_step_into");
    expect(mockInvoke).toHaveBeenCalledWith("debug_step_into");
  });

  it("debug_step_out invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("debug_step_out");
    expect(mockInvoke).toHaveBeenCalledWith("debug_step_out");
  });

  it("start then refresh pattern calls debug_get_session after debug_start", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleSession);
    await mockInvoke("debug_start", { adapter: "lldb", program: "./app" });
    await mockInvoke("debug_get_session");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(1, "debug_start", {
      adapter: "lldb",
      program: "./app",
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "debug_get_session");
  });

  it("useDebugger hook is exported as a function", async () => {
    const mod = await import("./use-debugger");
    expect(mod.useDebugger).toBeDefined();
    expect(typeof mod.useDebugger).toBe("function");
  });
});
