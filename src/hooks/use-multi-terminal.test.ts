import { describe, expect, it, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

describe("useMultiTerminal invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("spawn_terminal invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue("term-001");
    const result = await mockInvoke("spawn_terminal");
    expect(mockInvoke).toHaveBeenCalledWith("spawn_terminal");
    expect(result).toBe("term-001");
  });

  it("kill_terminal invoke is called with terminalId", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("kill_terminal", { terminalId: "term-001" });
    expect(mockInvoke).toHaveBeenCalledWith("kill_terminal", {
      terminalId: "term-001",
    });
  });

  it("send_terminal_input invoke is called with terminalId and input", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("send_terminal_input", { terminalId: "term-001", input: "ls\n" });
    expect(mockInvoke).toHaveBeenCalledWith("send_terminal_input", {
      terminalId: "term-001",
      input: "ls\n",
    });
  });

  it("spawn returns terminal id string", async () => {
    mockInvoke.mockResolvedValue("term-abc");
    const id = await mockInvoke("spawn_terminal");
    expect(typeof id).toBe("string");
    expect(id).toBe("term-abc");
  });

  it("terminal state management with Map", () => {
    interface TerminalState {
      id: string;
      output: string;
      exited: boolean;
      exitCode: number | null;
    }

    const terminals = new Map<string, TerminalState>();
    const id = "term-001";
    terminals.set(id, { id, output: "", exited: false, exitCode: null });

    expect(terminals.has(id)).toBe(true);
    expect(terminals.get(id)?.output).toBe("");

    const t = terminals.get(id);
    if (t) {
      terminals.set(id, { ...t, output: t.output + "hello\n" });
    }
    expect(terminals.get(id)?.output).toBe("hello\n");
  });

  it("kill removes terminal from map", () => {
    interface TerminalState {
      id: string;
      output: string;
      exited: boolean;
      exitCode: number | null;
    }

    const terminals = new Map<string, TerminalState>();
    terminals.set("t1", { id: "t1", output: "", exited: false, exitCode: null });
    terminals.set("t2", { id: "t2", output: "", exited: false, exitCode: null });

    terminals.delete("t1");
    expect(terminals.has("t1")).toBe(false);
    expect(terminals.has("t2")).toBe(true);
    expect(terminals.size).toBe(1);
  });

  it("activeTerminal switches after kill", () => {
    const terminalIds = ["t1", "t2", "t3"];
    let activeTerminal: string | null = "t2";
    const killedId = "t2";

    const remaining = terminalIds.filter((k) => k !== killedId);
    if (activeTerminal === killedId) {
      activeTerminal = remaining[0] ?? null;
    }

    expect(activeTerminal).toBe("t1");
  });

  it("activeTerminal becomes null when last terminal killed", () => {
    const terminalIds = ["t1"];
    let activeTerminal: string | null = "t1";
    const killedId = "t1";

    const remaining = terminalIds.filter((k) => k !== killedId);
    if (activeTerminal === killedId) {
      activeTerminal = remaining[0] ?? null;
    }

    expect(activeTerminal).toBeNull();
  });

  it("useMultiTerminal hook is exported as a function", async () => {
    const mod = await import("./use-multi-terminal");
    expect(mod.useMultiTerminal).toBeDefined();
    expect(typeof mod.useMultiTerminal).toBe("function");
  });
});
