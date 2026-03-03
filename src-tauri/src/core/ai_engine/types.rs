use serde::Deserialize;

/// Raw JSON events from Claude CLI --output-format stream-json
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClaudeStreamEvent {
    #[serde(rename = "assistant")]
    Assistant {
        message: AssistantMessage,
    },

    #[serde(rename = "user")]
    User {
        message: UserMessage,
        #[serde(default)]
        tool_use_result: Option<serde_json::Value>,
    },

    #[serde(rename = "result")]
    Result {
        result: String,
        #[serde(default)]
        is_error: bool,
        session_id: Option<String>,
    },

    #[serde(rename = "system")]
    System {},

    #[serde(rename = "rate_limit_event")]
    RateLimitEvent {},

    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
pub struct AssistantMessage {
    #[serde(default)]
    pub content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
pub struct UserMessage {
    #[serde(default)]
    pub content: Vec<UserContentBlock>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum UserContentBlock {
    #[serde(rename = "tool_result")]
    ToolResult { tool_use_id: String },

    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
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

    #[serde(rename = "thinking")]
    Thinking {},

    #[serde(other)]
    Unknown,
}

/// Structured result from CLI tool execution
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ToolUseResult {
    #[serde(rename = "create")]
    Create {
        #[serde(rename = "filePath")]
        file_path: String,
        #[serde(default)]
        content: String,
    },

    #[serde(rename = "update")]
    Update {
        #[serde(rename = "filePath")]
        file_path: String,
        #[serde(default)]
        content: Option<String>,
    },

    #[serde(other)]
    Other,
}
