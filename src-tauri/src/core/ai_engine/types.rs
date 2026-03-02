use serde::Deserialize;

/// Raw JSON events from Claude CLI --output-format stream-json
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClaudeStreamEvent {
    #[serde(rename = "assistant")]
    Assistant { message: AssistantMessage },

    #[serde(rename = "content_block_start")]
    ContentBlockStart {
        index: usize,
        content_block: ContentBlock,
    },

    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: Delta },

    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: usize },

    #[serde(rename = "message_start")]
    MessageStart {},

    #[serde(rename = "message_stop")]
    MessageStop {},

    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
pub struct AssistantMessage {
    pub content: Option<Vec<ContentBlock>>,
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

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum Delta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },

    #[serde(rename = "input_json_delta")]
    InputJsonDelta { partial_json: String },

    #[serde(other)]
    Unknown,
}
