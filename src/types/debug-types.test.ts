import { describe, expect, it } from "vitest";
import type {
  Breakpoint,
  StackFrame,
  Variable,
  DebugState,
  DebugSession,
} from "./debug-types";

describe("debug-types", () => {
  it("Breakpoint conforms to the expected shape", () => {
    const bp: Breakpoint = { id: 1, path: "main.rs", line: 42, verified: true };
    expect(bp.id).toBe(1);
    expect(bp.path).toBe("main.rs");
    expect(bp.line).toBe(42);
    expect(bp.verified).toBe(true);
  });

  it("StackFrame conforms to the expected shape", () => {
    const frame: StackFrame = {
      id: 0,
      name: "main",
      source_path: "src/main.rs",
      line: 10,
      column: 1,
    };
    expect(frame.id).toBe(0);
    expect(frame.name).toBe("main");
    expect(frame.source_path).toBe("src/main.rs");
    expect(frame.line).toBe(10);
    expect(frame.column).toBe(1);
  });

  it("StackFrame allows null source_path", () => {
    const frame: StackFrame = {
      id: 1,
      name: "<unknown>",
      source_path: null,
      line: 0,
      column: 0,
    };
    expect(frame.source_path).toBeNull();
  });

  it("Variable conforms to the expected shape", () => {
    const variable: Variable = {
      name: "x",
      value: "42",
      kind: "int",
      children_ref: 0,
    };
    expect(variable.name).toBe("x");
    expect(variable.value).toBe("42");
    expect(variable.kind).toBe("int");
    expect(variable.children_ref).toBe(0);
  });

  it("DebugState Stopped variant", () => {
    const state: DebugState = { state: "Stopped" };
    expect(state.state).toBe("Stopped");
  });

  it("DebugState Running variant", () => {
    const state: DebugState = { state: "Running" };
    expect(state.state).toBe("Running");
  });

  it("DebugState Paused variant includes reason", () => {
    const state: DebugState = { state: "Paused", reason: "breakpoint" };
    expect(state.state).toBe("Paused");
    if (state.state === "Paused") {
      expect(state.reason).toBe("breakpoint");
    }
  });

  it("DebugState Exited variant includes code", () => {
    const state: DebugState = { state: "Exited", code: 0 };
    expect(state.state).toBe("Exited");
    if (state.state === "Exited") {
      expect(state.code).toBe(0);
    }
  });

  it("DebugSession conforms to the expected shape", () => {
    const session: DebugSession = {
      state: { state: "Running" },
      breakpoints: [{ id: 1, path: "main.rs", line: 5, verified: true }],
      stack_frames: [],
      variables: [],
      thread_id: 1,
    };
    expect(session.state.state).toBe("Running");
    expect(session.breakpoints).toHaveLength(1);
    expect(session.stack_frames).toEqual([]);
    expect(session.variables).toEqual([]);
    expect(session.thread_id).toBe(1);
  });

  it("DebugSession allows null thread_id", () => {
    const session: DebugSession = {
      state: { state: "Stopped" },
      breakpoints: [],
      stack_frames: [],
      variables: [],
      thread_id: null,
    };
    expect(session.thread_id).toBeNull();
  });
});
