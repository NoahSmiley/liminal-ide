use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use uuid::Uuid;

use crate::core::events::{AiEvent, AppEvent, EventBus};
use crate::error::AiError;

use super::types::{ClaudeStreamEvent, ContentBlock};

pub async fn stream_claude_response(
    event_bus: &EventBus,
    session_id: Uuid,
    prompt: &str,
    system_prompt: &str,
    model: &str,
) -> Result<String, AiError> {
    let mut child = Command::new("claude")
        .args([
            "-p",
            "--output-format",
            "stream-json",
            "--model",
            model,
            "--verbose",
            "--dangerously-skip-permissions",
            "--disable-slash-commands",
            "--no-session-persistence",
            "--setting-sources",
            "",
            "--system-prompt",
            system_prompt,
            prompt,
        ])
        .env_remove("CLAUDECODE")
        .env("DISABLE_AUTOUPDATER", "1")
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
    let mut last_len: usize = 0;

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<ClaudeStreamEvent>(&line) {
            Ok(ClaudeStreamEvent::Assistant { message }) => {
                // Build full text from content blocks
                let text: String = message
                    .content
                    .iter()
                    .filter_map(|b| match b {
                        ContentBlock::Text { text } => Some(text.as_str()),
                        _ => None,
                    })
                    .collect();

                if text.len() > last_len {
                    let delta = &text[last_len..];
                    event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
                        session_id,
                        content: delta.to_string(),
                    }));
                    last_len = text.len();
                }

                full_response = text;

                // Handle tool use blocks
                for block in &message.content {
                    if let ContentBlock::ToolUse { id, name, input } = block {
                        event_bus.emit(AppEvent::Ai(AiEvent::ToolUse {
                            session_id,
                            tool_id: id.clone(),
                            name: name.clone(),
                            input: input.to_string(),
                        }));
                    }
                }
            }
            Ok(ClaudeStreamEvent::Result { result, is_error }) => {
                if is_error {
                    return Err(AiError::ProcessCrashed(result));
                }
                // If we didn't get streaming content, use the final result
                if full_response.is_empty() && !result.is_empty() {
                    full_response = result.clone();
                    event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
                        session_id,
                        content: result,
                    }));
                }
            }
            Ok(_) => {} // system, rate_limit, unknown — skip
            Err(e) => {
                eprintln!("[liminal] failed to parse stream event: {}", e);
                eprintln!("[liminal]   line: {}", &line[..line.len().min(200)]);
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

    if !status.success() && full_response.is_empty() {
        let stderr_output = if let Some(mut stderr) = child.stderr.take() {
            let mut buf = String::new();
            use tokio::io::AsyncReadExt;
            let _ = stderr.read_to_string(&mut buf).await;
            buf
        } else {
            String::new()
        };
        let detail = if stderr_output.is_empty() {
            format!("exit {}", status)
        } else {
            stderr_output.trim().to_string()
        };
        return Err(AiError::ProcessCrashed(detail));
    }

    event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
    Ok(full_response)
}
