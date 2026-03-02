use serde::Deserialize;

/// Raw JSON events from Claude CLI --output-format stream-json
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClaudeStreamEvent {
    #[serde(rename = "assistant")]
    Assistant {
        message: AssistantMessage,
    },

    #[serde(rename = "result")]
    Result {
        result: String,
        #[serde(default)]
        is_error: bool,
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

    #[serde(other)]
    Unknown,
}
