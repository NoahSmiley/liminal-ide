export interface Breakpoint {
  id: number;
  path: string;
  line: number;
  verified: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  source_path: string | null;
  line: number;
  column: number;
}

export interface Variable {
  name: string;
  value: string;
  kind: string;
  children_ref: number;
}

export type DebugState =
  | { state: "Stopped" }
  | { state: "Running" }
  | { state: "Paused"; reason: string }
  | { state: "Exited"; code: number };

export interface DebugSession {
  state: DebugState;
  breakpoints: Breakpoint[];
  stack_frames: StackFrame[];
  variables: Variable[];
  thread_id: number | null;
}
