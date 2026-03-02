export type TerminalEvent =
  | { kind: "Output"; terminal_id: string; data: string }
  | { kind: "Exit"; terminal_id: string; code: number };
