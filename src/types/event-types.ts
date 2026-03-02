import type { AiEvent } from "./ai-types";
import type { FsEvent } from "./fs-types";
import type { TerminalEvent } from "./terminal-types";

export type AppEvent =
  | { type: "Ai"; payload: AiEvent }
  | { type: "Fs"; payload: FsEvent }
  | { type: "Terminal"; payload: TerminalEvent }
  | { type: "System"; payload: SystemEvent };

export type SystemEvent =
  | { kind: "Ready" }
  | { kind: "Error"; message: string };
