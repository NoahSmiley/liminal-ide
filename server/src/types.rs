use serde::{Deserialize, Serialize};

// ── Incoming request types ──

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub project_id: String,
    pub agent_id: String,
    pub messages: Vec<Message>,
    pub system_prompt: Option<String>,
    pub tools: Option<Vec<ToolDefinition>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Message {
    pub role: String,
    pub content: MessageContent,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Blocks(Vec<ContentBlock>),
}

impl MessageContent {
    pub fn as_text(&self) -> String {
        match self {
            MessageContent::Text(s) => s.clone(),
            MessageContent::Blocks(blocks) => blocks
                .iter()
                .filter_map(|b| match b {
                    ContentBlock::Text { text } => Some(text.clone()),
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join("\n"),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "tool_result")]
    ToolResult {
        tool_use_id: String,
        content: String,
    },
}

// ── Tool definitions ──

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

// ── Tool result submission ──

#[derive(Debug, Deserialize)]
pub struct ToolResultRequest {
    pub conversation_id: String,
    pub tool_use_id: String,
    pub result: String,
}

// ── Team chat request (orchestrated multi-agent) ──

#[derive(Debug, Deserialize)]
pub struct TeamChatRequest {
    pub project_id: String,
    pub messages: Vec<Message>,
    pub board_state: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TeamToolResultRequest {
    pub conversation_id: String,
    pub tool_use_id: String,
    pub result: String,
    pub board_state: Option<String>,
}

// ── SSE event types sent to frontend ──

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum ChatEvent {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(rename = "error")]
    Error { message: String },
    #[serde(rename = "conversation_id")]
    ConversationId { id: String },
    #[serde(rename = "agent_start")]
    AgentStart {
        agent_id: String,
        agent_name: String,
        role: String,
    },
    #[serde(rename = "agent_end")]
    AgentEnd { agent_id: String },
    #[serde(rename = "orchestration_plan")]
    OrchestrationPlan {
        agents: Vec<String>,
        summary: String,
    },
    #[serde(rename = "orchestration_complete")]
    OrchestrationComplete,
    #[serde(rename = "round_start")]
    RoundStart { round: u32, agents: Vec<String> },
    #[serde(rename = "round_end")]
    RoundEnd { round: u32 },
    #[serde(rename = "user_interjection_ack")]
    UserInterjectionAck,
}

// ── Team interjection request ──

#[derive(Debug, Deserialize)]
pub struct TeamInterjectionRequest {
    pub conversation_id: String,
    pub message: String,
    pub board_state: Option<String>,
}

// ── Health check ──

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub claude_available: bool,
}

// ── Claude CLI output types (stream-json format) ──

#[derive(Debug, Deserialize)]
pub struct ClaudeStreamEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    // For content_block_delta
    pub delta: Option<ClaudeDelta>,
    // For content_block_start
    pub content_block: Option<ClaudeContentBlock>,
    // For message_start
    pub message: Option<serde_json::Value>,
    // Result message (for --output-format json)
    pub result: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClaudeDelta {
    #[serde(rename = "type")]
    pub delta_type: Option<String>,
    pub text: Option<String>,
    pub partial_json: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClaudeContentBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub id: Option<String>,
    pub name: Option<String>,
    pub input: Option<serde_json::Value>,
    pub text: Option<String>,
}
