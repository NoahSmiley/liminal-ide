const BASE_URL = "http://localhost:3456";

// ── Types ──

export interface ChatRequest {
  project_id: string;
  agent_id: string;
  messages: { role: string; content: string }[];
  system_prompt?: string;
}

export interface ToolResultRequest {
  conversation_id: string;
  tool_use_id: string;
  result: string;
}

export interface TeamChatRequest {
  project_id: string;
  messages: { role: string; content: string }[];
  board_state?: string;
}

export interface TeamToolResultRequest {
  conversation_id: string;
  tool_use_id: string;
  result: string;
  board_state?: string;
}

export type ChatEvent =
  | { type: "conversation_id"; id: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "message_stop" }
  | { type: "error"; message: string }
  | { type: "agent_start"; agent_id: string; agent_name: string; role: string }
  | { type: "agent_end"; agent_id: string }
  | { type: "orchestration_plan"; agents: string[]; summary: string }
  | { type: "orchestration_complete" }
  | { type: "round_start"; round: number; agents: string[] }
  | { type: "round_end"; round: number }
  | { type: "user_interjection_ack" };

export interface HealthResponse {
  ok: boolean;
  claude_available: boolean;
}

// ── API functions ──

export async function restartServer(): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE_URL}/api/restart`, {
    method: "POST",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Restart failed: ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/api/health`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function* streamChat(
  params: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  yield* parseSSEStream(res, signal);
}

export async function* sendToolResult(
  params: ToolResultRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_URL}/api/tool-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Tool result request failed: ${res.status}`);
  }

  yield* parseSSEStream(res, signal);
}

export async function* streamTeamChat(
  params: TeamChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_URL}/api/team-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Team chat request failed: ${res.status}`);
  }

  yield* parseSSEStream(res, signal);
}

export async function* sendTeamToolResult(
  params: TeamToolResultRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_URL}/api/team-tool-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Team tool result request failed: ${res.status}`);
  }

  yield* parseSSEStream(res, signal);
}

export async function sendTeamInterjection(params: {
  conversation_id: string;
  message: string;
  board_state?: string;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE_URL}/api/team-interject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Interjection failed: ${res.status}`);
  return res.json();
}

// ── SSE parser ──

async function* parseSSEStream(
  res: Response,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (!data) continue;
            try {
              const event = JSON.parse(data) as ChatEvent;
              yield event;
            } catch {
              // Skip unparseable events
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
