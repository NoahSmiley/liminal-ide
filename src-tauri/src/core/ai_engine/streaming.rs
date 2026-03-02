use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use uuid::Uuid;

use crate::core::events::{AiEvent, AppEvent, EventBus};
use crate::error::AiError;

use super::types::{ClaudeStreamEvent, ContentBlock, Delta};

pub async fn stream_claude_response(
    event_bus: &EventBus,
    session_id: Uuid,
    prompt: &str,
    system_prompt: &str,
    model: &str,
) -> Result<String, AiError> {
    let mut child = Command::new("claude")
        .args([
            "--output-format",
            "stream-json",
            "--model",
            model,
            "--verbose",
            "--system-prompt",
            system_prompt,
            "--prompt",
            prompt,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| AiError::CliNotFound)?;

    let stdout = child
        .stdout
        .take()
        .ok_or(AiError::ProcessCrashed("No stdout".into()))?;

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut full_response = String::new();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(event) = serde_json::from_str::<ClaudeStreamEvent>(&line) {
            handle_stream_event(event_bus, session_id, &event, &mut full_response);
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

    if !status.success() {
        return Err(AiError::ProcessCrashed(format!(
            "Claude exited with code: {}",
            status
        )));
    }

    event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
    Ok(full_response)
}

fn handle_stream_event(
    event_bus: &EventBus,
    session_id: Uuid,
    event: &ClaudeStreamEvent,
    full_response: &mut String,
) {
    match event {
        ClaudeStreamEvent::ContentBlockDelta { delta, .. } => {
            if let Delta::TextDelta { text } = delta {
                full_response.push_str(text);
                event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
                    session_id,
                    content: text.clone(),
                }));
            }
        }
        ClaudeStreamEvent::ContentBlockStart { content_block, .. } => {
            if let ContentBlock::ToolUse { id, name, input } = content_block {
                event_bus.emit(AppEvent::Ai(AiEvent::ToolUse {
                    session_id,
                    tool_id: id.clone(),
                    name: name.clone(),
                    input: input.to_string(),
                }));
            }
        }
        _ => {}
    }
}
