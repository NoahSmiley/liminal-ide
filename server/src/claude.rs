use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::{mpsc, watch};

use crate::tools::board_tools;
use crate::types::{
    ChatEvent, ClaudeContentBlock, ClaudeStreamEvent, Message, ToolDefinition,
};

/// Error type for cancellable streaming.
pub enum StreamError {
    Failed(String),
    /// Cancelled by interjection; contains partial captured text.
    Cancelled(String),
}

/// Check if the `claude` CLI is available and authenticated.
pub async fn check_available() -> bool {
    match Command::new("claude")
        .args(["--version"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await
    {
        Ok(status) => status.success(),
        Err(_) => false,
    }
}

/// Build the CLI command with common flags.
fn build_claude_cmd(prompt: &str, system_prompt: &str) -> Command {
    let mut cmd = Command::new("claude");
    cmd.env_remove("CLAUDECODE");
    cmd.args([
        "-p",
        prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--model",
        "sonnet",
        "--system-prompt",
        system_prompt,
        "--tools",
        "",
        "--no-session-persistence",
    ]);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd
}

/// Extract the inner event from a verbose stream line.
/// Lines can be:
///   {"type":"stream_event","event":{...}} — unwrap to inner event
///   {"type":"system",...} — skip
///   {"type":"assistant",...} — skip (full message duplicate)
///   {"type":"result",...} — skip
///   {"type":"content_block_delta",...} — direct event (old format fallback)
fn parse_stream_line(line: &str) -> Option<ClaudeStreamEvent> {
    let raw: serde_json::Value = serde_json::from_str(line).ok()?;
    let type_str = raw.get("type")?.as_str()?;

    match type_str {
        "stream_event" => {
            // Unwrap the inner event
            let inner = raw.get("event")?;
            serde_json::from_value(inner.clone()).ok()
        }
        // Direct event types (old format or fallback)
        "content_block_start" | "content_block_delta" | "content_block_stop"
        | "message_start" | "message_stop" | "message_end" | "error" => {
            serde_json::from_value(raw).ok()
        }
        _ => None, // Skip system, assistant, result, rate_limit_event, etc.
    }
}

/// Process parsed stream events, emitting ChatEvents to the channel.
/// Returns updated tool state and any captured text.
async fn process_event(
    event: &ClaudeStreamEvent,
    tx: &mpsc::Sender<ChatEvent>,
    current_tool_id: &mut Option<String>,
    current_tool_name: &mut Option<String>,
    tool_input_json: &mut String,
    captured_text: Option<&mut String>,
) -> bool {
    // Returns true if a tool_use was emitted
    match event.event_type.as_str() {
        "content_block_start" => {
            if let Some(block) = &event.content_block {
                handle_block_start(block, current_tool_id, current_tool_name, tool_input_json);
            }
            false
        }
        "content_block_delta" => {
            if let Some(delta) = &event.delta {
                if let Some(text) = &delta.text {
                    if let Some(cap) = captured_text {
                        cap.push_str(text);
                    }
                    let _ = tx.send(ChatEvent::TextDelta { text: text.clone() }).await;
                }
                if let Some(partial) = &delta.partial_json {
                    tool_input_json.push_str(partial);
                }
            }
            false
        }
        "content_block_stop" => {
            if let (Some(id), Some(name)) = (current_tool_id.take(), current_tool_name.take()) {
                let input: serde_json::Value =
                    serde_json::from_str(tool_input_json).unwrap_or(serde_json::Value::Null);
                tool_input_json.clear();
                let _ = tx.send(ChatEvent::ToolUse { id, name, input }).await;
                return true;
            }
            false
        }
        "message_stop" | "message_end" => {
            let _ = tx.send(ChatEvent::MessageStop).await;
            false
        }
        "error" => {
            let msg = event
                .result
                .clone()
                .unwrap_or_else(|| "Unknown error from claude CLI".to_string());
            let _ = tx.send(ChatEvent::Error { message: msg }).await;
            false
        }
        _ => false,
    }
}

/// Spawn a claude CLI process for a chat request and stream events back.
pub async fn stream_chat(
    system_prompt: &str,
    messages: &[Message],
    _extra_tools: Option<&[ToolDefinition]>,
    tx: mpsc::Sender<ChatEvent>,
) -> Result<(), String> {
    let prompt = build_prompt(messages);
    let mut cmd = build_claude_cmd(&prompt, system_prompt);

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {e}"))?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[claude stderr] {line}");
            }
        });
    }

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_tool_id: Option<String> = None;
    let mut current_tool_name: Option<String> = None;
    let mut tool_input_json = String::new();

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        if let Some(event) = parse_stream_line(&line) {
            process_event(
                &event,
                &tx,
                &mut current_tool_id,
                &mut current_tool_name,
                &mut tool_input_json,
                None,
            )
            .await;
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for claude process: {e}"))?;

    if !status.success() {
        let _ = tx
            .send(ChatEvent::Error {
                message: format!("claude process exited with status: {status}"),
            })
            .await;
    }

    Ok(())
}

/// Like `stream_chat` but also returns the full accumulated text.
/// Used by orchestration so prior agent responses can be passed to subsequent agents.
pub async fn stream_chat_with_capture(
    system_prompt: &str,
    messages: &[Message],
    _extra_tools: Option<&[ToolDefinition]>,
    tx: mpsc::Sender<ChatEvent>,
) -> Result<String, String> {
    let prompt = build_prompt(messages);
    let mut cmd = build_claude_cmd(&prompt, system_prompt);

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn claude: {e}"))?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[claude stderr] {line}");
            }
        });
    }

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_tool_id: Option<String> = None;
    let mut current_tool_name: Option<String> = None;
    let mut tool_input_json = String::new();
    let mut captured_text = String::new();
    let mut hit_tool_use = false;

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        if let Some(event) = parse_stream_line(&line) {
            // Skip message_stop if we hit a tool_use (tool result will continue)
            if matches!(event.event_type.as_str(), "message_stop" | "message_end") && hit_tool_use {
                continue;
            }
            let was_tool = process_event(
                &event,
                &tx,
                &mut current_tool_id,
                &mut current_tool_name,
                &mut tool_input_json,
                Some(&mut captured_text),
            )
            .await;
            if was_tool {
                hit_tool_use = true;
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for claude process: {e}"))?;

    if !status.success() {
        let _ = tx
            .send(ChatEvent::Error {
                message: format!("claude process exited with status: {status}"),
            })
            .await;
    }

    Ok(captured_text)
}

/// Like `stream_chat_with_capture` but can be cancelled via a watch channel.
/// Returns `StreamError::Cancelled(partial_text)` if cancelled.
pub async fn stream_chat_with_capture_cancellable(
    system_prompt: &str,
    messages: &[Message],
    _extra_tools: Option<&[ToolDefinition]>,
    tx: mpsc::Sender<ChatEvent>,
    mut cancel_rx: watch::Receiver<bool>,
) -> Result<String, StreamError> {
    let prompt = build_prompt(messages);
    let mut cmd = build_claude_cmd(&prompt, system_prompt);

    let mut child = cmd
        .spawn()
        .map_err(|e| StreamError::Failed(format!("Failed to spawn claude: {e}")))?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| StreamError::Failed("Failed to capture stdout".to_string()))?;

    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[claude stderr] {line}");
            }
        });
    }

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_tool_id: Option<String> = None;
    let mut current_tool_name: Option<String> = None;
    let mut tool_input_json = String::new();
    let mut captured_text = String::new();
    let mut hit_tool_use = false;

    loop {
        tokio::select! {
            line_result = lines.next_line() => {
                match line_result {
                    Ok(Some(line)) => {
                        let line = line.trim().to_string();
                        if line.is_empty() {
                            continue;
                        }
                        if let Some(event) = parse_stream_line(&line) {
                            if matches!(event.event_type.as_str(), "message_stop" | "message_end") && hit_tool_use {
                                continue;
                            }
                            let was_tool = process_event(
                                &event,
                                &tx,
                                &mut current_tool_id,
                                &mut current_tool_name,
                                &mut tool_input_json,
                                Some(&mut captured_text),
                            )
                            .await;
                            if was_tool {
                                hit_tool_use = true;
                            }
                        }
                    }
                    Ok(None) => break, // EOF
                    Err(_) => break,
                }
            }
            _ = cancel_rx.changed() => {
                if *cancel_rx.borrow() {
                    let _ = child.kill().await;
                    return Err(StreamError::Cancelled(captured_text));
                }
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| StreamError::Failed(format!("Failed to wait for claude process: {e}")))?;

    if !status.success() {
        let _ = tx
            .send(ChatEvent::Error {
                message: format!("claude process exited with status: {status}"),
            })
            .await;
    }

    Ok(captured_text)
}

fn handle_block_start(
    block: &ClaudeContentBlock,
    current_tool_id: &mut Option<String>,
    current_tool_name: &mut Option<String>,
    tool_input_json: &mut String,
) {
    match block.block_type.as_str() {
        "tool_use" => {
            *current_tool_id = block.id.clone();
            *current_tool_name = block.name.clone();
            tool_input_json.clear();
        }
        "text" => {
            // Text blocks start — deltas will follow
        }
        _ => {}
    }
}

/// Build a prompt string from a message history.
fn build_prompt(messages: &[Message]) -> String {
    if messages.len() == 1 {
        return messages[0].content.as_text();
    }

    messages
        .iter()
        .map(|m| {
            let role = match m.role.as_str() {
                "user" => "Human",
                "assistant" | "agent" => "Assistant",
                _ => &m.role,
            };
            format!("{role}: {}", m.content.as_text())
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// Build a system prompt for an agent with tool instructions embedded.
pub fn build_system_prompt(
    agent_name: &str,
    agent_role: &str,
    agent_tone: &str,
    agent_expertise: &[&str],
    agent_quirk: &str,
    project_name: &str,
    task_summary: &str,
) -> String {
    let tools = board_tools();
    let tool_descriptions: Vec<String> = tools
        .iter()
        .map(|t| format!("- {}: {}", t.name, t.description))
        .collect();

    format!(
        r#"You are {agent_name}, the {agent_role} of this project team.
Tone: {agent_tone}
Expertise: {expertise}
Style: {agent_quirk}

You have access to these tools to manage the project board:
{tools}

When you want to use a tool, output a tool_use block with the tool name and input parameters.

Current project context:
- Project: {project_name}
- Existing tasks: {task_summary}

Keep responses concise and in-character. Use markdown formatting."#,
        expertise = agent_expertise.join(", "),
        tools = tool_descriptions.join("\n"),
    )
}
