export type LintEvent =
  | { kind: "Started"; command: string }
  | { kind: "Complete"; success: boolean; output: string; command: string };
