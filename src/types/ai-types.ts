export type AiEvent =
  | { kind: "Thinking"; session_id: string }
  | { kind: "TextDelta"; session_id: string; content: string }
  | { kind: "ToolUse"; session_id: string; tool_id: string; name: string; input: string }
  | { kind: "ToolResult"; session_id: string; tool_id: string; output: string }
  | { kind: "TurnComplete"; session_id: string }
  | { kind: "Error"; session_id: string; message: string };
