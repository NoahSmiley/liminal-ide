use tokio::sync::{mpsc, watch};

use crate::claude::{self, StreamError};
use crate::state::{AppState, OrchestrationPhase};
use crate::types::{ChatEvent, Message, MessageContent};

/// Agent metadata for building system prompts.
struct AgentInfo {
    id: &'static str,
    name: &'static str,
    role: &'static str,
    role_label: &'static str,
    tone: &'static str,
    expertise: &'static [&'static str],
    quirk: &'static str,
}

const AGENTS: &[AgentInfo] = &[
    AgentInfo {
        id: "sage",
        name: "Sage",
        role: "pm",
        role_label: "Project Manager",
        tone: "Methodical and organized",
        expertise: &[
            "project planning",
            "requirements analysis",
            "task decomposition",
            "stakeholder communication",
        ],
        quirk: "Always uses numbered lists and acceptance criteria",
    },
    AgentInfo {
        id: "pixel",
        name: "Pixel",
        role: "designer",
        role_label: "Designer",
        tone: "Creative and user-focused",
        expertise: &[
            "UI design",
            "UX research",
            "design systems",
            "accessibility",
        ],
        quirk: "References design principles and always thinks about the end user",
    },
    AgentInfo {
        id: "atlas",
        name: "Atlas",
        role: "architect",
        role_label: "Architect",
        tone: "Analytical and pragmatic",
        expertise: &[
            "system design",
            "API architecture",
            "scalability",
            "technical decisions",
        ],
        quirk: "Thinks in diagrams and weighs trade-offs carefully",
    },
    AgentInfo {
        id: "forge",
        name: "Forge",
        role: "developer",
        role_label: "Developer",
        tone: "Direct and practical",
        expertise: &[
            "implementation",
            "code review",
            "debugging",
            "performance optimization",
        ],
        quirk: "Shows code snippets and prefers showing over telling",
    },
    AgentInfo {
        id: "scout",
        name: "Scout",
        role: "qa",
        role_label: "QA Engineer",
        tone: "Detail-oriented and skeptical",
        expertise: &[
            "testing strategy",
            "edge cases",
            "bug detection",
            "quality assurance",
        ],
        quirk: "Always asks 'but what if...' and looks for edge cases",
    },
    AgentInfo {
        id: "beacon",
        name: "Beacon",
        role: "devops",
        role_label: "DevOps Engineer",
        tone: "Systematic and reliable",
        expertise: &["deployment", "CI/CD", "monitoring", "infrastructure"],
        quirk: "Thinks about what happens when things go wrong",
    },
];

fn get_agent(id: &str) -> Option<&'static AgentInfo> {
    AGENTS.iter().find(|a| a.id == id)
}

/// Build the special system prompt for Sage during orchestration.
/// Includes the handoff instruction so Sage can delegate to other agents.
fn build_sage_orchestration_prompt(project_name: &str, board_state: &str) -> String {
    let agent_list = AGENTS
        .iter()
        .filter(|a| a.id != "sage")
        .map(|a| format!("  - {}: {} ({})", a.id, a.name, a.role_label))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"You are Sage, the Project Manager leading a real-time team discussion.
Tone: Methodical and organized
Expertise: project planning, requirements analysis, task decomposition, stakeholder communication
Style: Always uses numbered lists and acceptance criteria

You are orchestrating a live team conversation. Your teammates are real agents who will respond after you. This is NOT a solo interaction — you are the facilitator of a multi-agent discussion where each team member contributes their unique expertise.

You have access to these tools to manage the project board:
- create_task: Create a new task (params: title, description, status, priority, assigned_agent)
- update_task: Update a task (params: task_id, title?, description?, status?, priority?)
- move_task: Move a task to a different status column (params: task_id, new_status)
- list_tasks: List tasks (params: status? to filter)
- delete_task: Delete a task (params: task_id)

Current project context:
- Project: {project_name}
- Board state: {board_state}

CRITICAL INSTRUCTION — You MUST follow this format:
1. Respond briefly with your initial take (2-4 sentences max)
2. You MUST ALWAYS end your response with a handoff block. NO EXCEPTIONS.

Your response MUST end with this exact format:
<handoff>
{{"agents": ["agent_id1", "agent_id2"], "summary": "Brief description of what you need from them"}}
</handoff>

Available team members:
{agent_list}

EVERY response MUST include the handoff block — even for greetings, simple questions, or clarifications. You are a facilitator, not a solo responder.

EXCEPTION — Solo board operations: If the user's request is purely a board action (e.g. "clear the board", "delete all tasks", "list tasks", "move task X to done"), handle it yourself with the board tools and do NOT include a handoff block. These are mechanical operations that don't need team input.

IMPORTANT: Be selective about who you bring in. Only include 1-3 agents whose expertise is directly relevant. Do NOT bring in the whole team. For simple questions or greetings, 1-2 agents is plenty.

Keep your own response SHORT (2-4 sentences). Use markdown formatting."#
    )
}

/// Build a system prompt for a non-Sage agent during orchestration.
fn build_agent_orchestration_prompt(
    agent: &AgentInfo,
    project_name: &str,
    board_state: &str,
) -> String {
    format!(
        r#"You are {name}, the {role_label} of this project team.
Tone: {tone}
Expertise: {expertise}
Style: {quirk}

You have access to these tools to manage the project board:
- create_task: Create a new task (params: title, description, status, priority, assigned_agent)
- update_task: Update a task (params: task_id, title?, description?, status?, priority?)
- move_task: Move a task to a different status column (params: task_id, new_status)
- list_tasks: List tasks (params: status? to filter)
- delete_task: Delete a task (params: task_id)

Current project context:
- Project: {project_name}
- Board state: {board_state}

You are part of a team discussion. Sage (PM) has already analyzed the request and may have already performed board operations (creating, deleting, or updating tasks). Other team members may have already responded.

IMPORTANT: Do NOT duplicate board operations that Sage has already performed. If Sage created tasks, deleted tasks, or cleared the board, do NOT repeat those actions. Focus on adding your unique perspective, analysis, or recommendations based on your role and expertise. Only use board tools if you need to do something Sage did NOT already do.

You can reference other team members with @agentid (e.g. @forge, @atlas) to request their input in the next round. Only do this when you genuinely need another agent's perspective.

Available team: pixel, atlas, forge, scout, beacon

Keep responses concise and in-character. Use markdown formatting."#,
        name = agent.name,
        role_label = agent.role_label,
        tone = agent.tone,
        expertise = agent.expertise.join(", "),
        quirk = agent.quirk,
    )
}

/// Parse a `<handoff>` block from Sage's response.
/// Returns the list of agent IDs and a summary.
fn parse_handoff(text: &str) -> Option<(Vec<String>, String)> {
    let start = text.find("<handoff>")?;
    let end = text.find("</handoff>")?;
    if end <= start {
        return None;
    }

    let json_str = text[start + "<handoff>".len()..end].trim();
    let parsed: serde_json::Value = serde_json::from_str(json_str).ok()?;

    let agents = parsed
        .get("agents")?
        .as_array()?
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .filter(|id| get_agent(id).is_some() && id != "sage")
        .collect::<Vec<_>>();

    let summary = parsed
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if agents.is_empty() {
        None
    } else {
        Some((agents, summary))
    }
}

/// Strip the `<handoff>` block from text so it doesn't appear in chat.
fn strip_handoff(text: &str) -> String {
    if let Some(start) = text.find("<handoff>") {
        text[..start].trim_end().to_string()
    } else {
        text.to_string()
    }
}

/// Scan agent response text for @mentions of known agents.
fn parse_mentions(text: &str) -> Vec<String> {
    let known_ids: Vec<&str> = AGENTS.iter().filter(|a| a.id != "sage").map(|a| a.id).collect();
    let mut found = Vec::new();
    for word in text.split_whitespace() {
        let clean = word.trim_matches(|c: char| !c.is_alphanumeric() && c != '@');
        if let Some(id) = clean.strip_prefix('@') {
            if known_ids.contains(&id) && !found.contains(&id.to_string()) {
                found.push(id.to_string());
            }
        }
    }
    found
}

/// Decision from Sage's evaluation.
struct SageDecision {
    action: String, // "continue" or "conclude"
    agents: Vec<String>,
    summary: String,
}

/// Parse a `<decision>` block from Sage's evaluation response.
fn parse_decision(text: &str) -> Option<SageDecision> {
    let start = text.find("<decision>")?;
    let end = text.find("</decision>")?;
    if end <= start {
        return None;
    }

    let json_str = text[start + "<decision>".len()..end].trim();
    let parsed: serde_json::Value = serde_json::from_str(json_str).ok()?;

    let action = parsed.get("action")?.as_str()?.to_string();
    let agents = parsed
        .get("agents")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .filter(|id| get_agent(id).is_some() && id != "sage")
                .collect()
        })
        .unwrap_or_default();

    let summary = parsed
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Some(SageDecision {
        action,
        agents,
        summary,
    })
}

/// Strip the `<decision>` block from text.
fn strip_decision(text: &str) -> String {
    if let Some(start) = text.find("<decision>") {
        text[..start].trim_end().to_string()
    } else {
        text.to_string()
    }
}

/// Build Sage's evaluation prompt for after a round completes.
fn build_sage_evaluation_prompt(
    project_name: &str,
    board_state: &str,
    agent_responses: &[(String, String)],
    mentioned_agents: &[String],
    round: u32,
    max_rounds: u32,
) -> String {
    let discussion = agent_responses
        .iter()
        .map(|(id, text)| {
            let agent = get_agent(id);
            let label = agent
                .map(|a| format!("{} ({})", a.name, a.role_label))
                .unwrap_or_else(|| id.clone());
            format!("[{label}]: {text}")
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    let mention_note = if mentioned_agents.is_empty() {
        String::new()
    } else {
        format!(
            "\n\nTeam members mentioned by agents this round: {}. Consider including them.",
            mentioned_agents.join(", ")
        )
    };

    let agent_list = AGENTS
        .iter()
        .filter(|a| a.id != "sage")
        .map(|a| format!("  - {}: {} ({})", a.id, a.name, a.role_label))
        .collect::<Vec<_>>()
        .join("\n");

    let pressure = if round >= max_rounds - 1 {
        "\n\nYou MUST conclude now. This is the final round."
    } else if round >= 3 {
        "\n\nYou should almost certainly conclude. Only continue if there is a critical unresolved blocker."
    } else if round >= 2 {
        "\n\nStrongly prefer concluding. Only continue if someone raised a concrete unanswered question that another agent must address."
    } else {
        "\n\nDefault to concluding. Most discussions are complete after one round. Only continue if there is a specific unresolved question that requires a different agent's expertise — not just because more could be said."
    };

    format!(
        r#"You are Sage, the Project Manager evaluating whether the team discussion is complete.

Project: {project_name}
Board state: {board_state}
Current round: {round}/{max_rounds}

## Discussion so far:
{discussion}
{mention_note}{pressure}

Your job is simply to decide: is this discussion complete, or does a specific unresolved question need another agent's input?

Do NOT critique, scold, or evaluate the quality of what agents said. Do NOT comment on whether agents should or shouldn't have taken actions. Just decide if the discussion needs to continue or is complete.

At the END of your response, include a decision block:
<decision>
{{"action": "continue" or "conclude", "agents": ["agent_ids to include in next round"], "summary": "brief explanation"}}
</decision>

Available agents:
{agent_list}

If concluding, "agents" can be empty. If continuing, include only 1-2 agents max.
Keep your evaluation to 1 sentence — just the decision, no commentary."#
    )
}

/// Build Sage's interjection prompt when the user interjects mid-discussion.
fn build_sage_interjection_prompt(
    project_name: &str,
    board_state: &str,
    agent_responses: &[(String, String)],
    interjection: &str,
) -> String {
    let discussion = agent_responses
        .iter()
        .map(|(id, text)| {
            let agent = get_agent(id);
            let label = agent
                .map(|a| format!("{} ({})", a.name, a.role_label))
                .unwrap_or_else(|| id.clone());
            format!("[{label}]: {text}")
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");

    let agent_list = AGENTS
        .iter()
        .filter(|a| a.id != "sage")
        .map(|a| format!("  - {}: {} ({})", a.id, a.name, a.role_label))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"You are Sage, the Project Manager. The user has interjected during the team discussion.

Project: {project_name}
Board state: {board_state}

## Discussion so far:
{discussion}

## User interjection:
{interjection}

The user has redirected the discussion. Re-evaluate based on their new input. Decide who should respond next.

At the END of your response, include a decision block:
<decision>
{{"action": "continue" or "conclude", "agents": ["agent_ids"], "summary": "brief explanation"}}
</decision>

Available agents:
{agent_list}

Keep your evaluation concise and address the user's interjection directly."#
    )
}

/// Build message history for an agent, including prior agent responses.
fn build_conversation_for_agent(
    user_messages: &[Message],
    agent_responses: &[(String, String)],
) -> Vec<Message> {
    let mut messages = user_messages.to_vec();

    // Append prior agent responses as assistant context
    if !agent_responses.is_empty() {
        let context = agent_responses
            .iter()
            .map(|(agent_id, text)| {
                let agent = get_agent(agent_id);
                let label = agent
                    .map(|a| format!("{} ({})", a.name, a.role_label))
                    .unwrap_or_else(|| agent_id.clone());
                format!("[{label}]: {text}")
            })
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");

        messages.push(Message {
            role: "assistant".to_string(),
            content: MessageContent::Text(context),
        });

        // Follow up with a user message prompting the next agent
        messages.push(Message {
            role: "user".to_string(),
            content: MessageContent::Text(
                "Now it's your turn. Add your perspective based on your role and the discussion so far.".to_string(),
            ),
        });
    }

    messages
}

/// Run the full orchestration pipeline over a single SSE connection.
/// Supports multi-round discussion, @mentions, and user interjection.
pub async fn run_orchestration(
    state: AppState,
    conv_id: String,
    project_id: String,
    user_messages: Vec<Message>,
    board_state: String,
    tx: mpsc::Sender<ChatEvent>,
) {
    // Send conversation ID
    let _ = tx
        .send(ChatEvent::ConversationId {
            id: conv_id.clone(),
        })
        .await;

    // Create cancel signal for interjection support
    let (cancel_tx, cancel_rx) = watch::channel(false);
    {
        let mut signals = state.cancel_signals.lock().await;
        signals.insert(conv_id.clone(), cancel_tx);
    }

    let project_name = project_id.clone();
    let mut user_msgs = user_messages.clone();
    let max_rounds: u32 = 3;

    // ── Phase 1: Sage initial analysis ──
    let _ = tx
        .send(ChatEvent::AgentStart {
            agent_id: "sage".to_string(),
            agent_name: "Sage".to_string(),
            role: "pm".to_string(),
        })
        .await;

    let sage_prompt = build_sage_orchestration_prompt(&project_name, &board_state);

    let sage_result = claude::stream_chat_with_capture(
        &sage_prompt,
        &user_msgs,
        None,
        tx.clone(),
    )
    .await;

    let sage_text = match sage_result {
        Ok(text) => text,
        Err(e) => {
            let _ = tx.send(ChatEvent::Error { message: e }).await;
            let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;
            let _ = tx.send(ChatEvent::OrchestrationComplete).await;
            cleanup_cancel_signal(&state, &conv_id).await;
            return;
        }
    };

    let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;

    // ── Parse handoff ──
    // If Sage includes a handoff, delegate to those agents.
    // If no handoff block found, Sage handled it solo (e.g. board operation) — complete immediately.
    let (mut agent_queue, summary) = match parse_handoff(&sage_text) {
        Some((agents, summary)) => (agents, summary),
        None => {
            // No handoff = Sage handled it solo, complete the orchestration
            let sage_clean = strip_handoff(&sage_text);
            let agent_responses = vec![("sage".to_string(), sage_clean)];
            {
                let mut orchestrations = state.orchestrations.lock().await;
                if let Some(orch) = orchestrations.get_mut(&conv_id) {
                    orch.phase = OrchestrationPhase::Complete;
                    orch.agent_responses = agent_responses;
                }
            }
            cleanup_cancel_signal(&state, &conv_id).await;
            let _ = tx.send(ChatEvent::OrchestrationComplete).await;
            return;
        }
    };

    let _ = tx
        .send(ChatEvent::OrchestrationPlan {
            agents: agent_queue.clone(),
            summary,
        })
        .await;

    let sage_clean = strip_handoff(&sage_text);
    let mut agent_responses: Vec<(String, String)> = vec![("sage".to_string(), sage_clean)];
    let mut round: u32 = 1;

    let _ = tx
        .send(ChatEvent::RoundStart {
            round,
            agents: agent_queue.clone(),
        })
        .await;

    // ── Phase 2: Multi-round loop ──
    loop {
        if round > max_rounds {
            break;
        }

        let mut mention_queue: Vec<String> = Vec::new();

        for agent_id in &agent_queue {
            // Check for interjection before starting each agent
            {
                let orchestrations = state.orchestrations.lock().await;
                if let Some(orch) = orchestrations.get(&conv_id) {
                    if orch.interrupted {
                        break;
                    }
                }
            }

            let agent = match get_agent(agent_id) {
                Some(a) => a,
                None => continue,
            };

            let _ = tx
                .send(ChatEvent::AgentStart {
                    agent_id: agent_id.clone(),
                    agent_name: agent.name.to_string(),
                    role: agent.role.to_string(),
                })
                .await;

            let agent_prompt = build_agent_orchestration_prompt(agent, &project_name, &board_state);
            let agent_messages = build_conversation_for_agent(&user_msgs, &agent_responses);

            // Store state for potential tool result resumption
            {
                let mut orchestrations = state.orchestrations.lock().await;
                if let Some(orch) = orchestrations.get_mut(&conv_id) {
                    orch.current_agent = Some(agent_id.clone());
                    orch.current_system_prompt = Some(agent_prompt.clone());
                    orch.current_messages = agent_messages.clone();
                    orch.phase = OrchestrationPhase::RunningAgents;
                    orch.agent_responses = agent_responses.clone();
                    orch.round = round;
                    let idx = agent_queue.iter().position(|a| a == agent_id).unwrap_or(0);
                    orch.agent_queue = agent_queue[idx + 1..].to_vec();
                }
            }

            let result = claude::stream_chat_with_capture_cancellable(
                &agent_prompt,
                &agent_messages,
                None,
                tx.clone(),
                cancel_rx.clone(),
            )
            .await;

            match result {
                Ok(text) => {
                    let mentions = parse_mentions(&text);
                    for m in mentions {
                        if !mention_queue.contains(&m) {
                            mention_queue.push(m);
                        }
                    }
                    agent_responses.push((agent_id.clone(), text));
                }
                Err(StreamError::Cancelled(partial)) => {
                    let marked = if partial.is_empty() {
                        "[interrupted]".to_string()
                    } else {
                        format!("{partial}\n\n[interrupted]")
                    };
                    agent_responses.push((agent_id.clone(), marked));
                    let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                    break;
                }
                Err(StreamError::Failed(e)) => {
                    let _ = tx.send(ChatEvent::Error { message: e }).await;
                }
            }

            let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
        }

        let _ = tx.send(ChatEvent::RoundEnd { round }).await;

        // ── Check for user interjection ──
        let interjection = {
            let mut orchestrations = state.orchestrations.lock().await;
            if let Some(orch) = orchestrations.get_mut(&conv_id) {
                if orch.interrupted {
                    let msg = orch.interjection_message.take();
                    orch.interrupted = false;
                    msg
                } else {
                    None
                }
            } else {
                None
            }
        };

        if let Some(interjection_text) = interjection {
            let _ = tx.send(ChatEvent::UserInterjectionAck).await;

            // Add interjection to user messages
            user_msgs.push(Message {
                role: "user".to_string(),
                content: MessageContent::Text(interjection_text.clone()),
            });

            round += 1;
            if round > max_rounds {
                break;
            }

            // Sage re-evaluates with interjection context
            let _ = tx
                .send(ChatEvent::AgentStart {
                    agent_id: "sage".to_string(),
                    agent_name: "Sage".to_string(),
                    role: "pm".to_string(),
                })
                .await;

            {
                let mut orchestrations = state.orchestrations.lock().await;
                if let Some(orch) = orchestrations.get_mut(&conv_id) {
                    orch.phase = OrchestrationPhase::Interrupted;
                    orch.agent_responses = agent_responses.clone();
                    orch.user_messages = user_msgs.clone();
                }
            }

            let interjection_prompt = build_sage_interjection_prompt(
                &project_name,
                &board_state,
                &agent_responses,
                &interjection_text,
            );

            let sage_eval = claude::stream_chat_with_capture(
                &interjection_prompt,
                &user_msgs,
                None,
                tx.clone(),
            )
            .await;

            let sage_eval_text = match sage_eval {
                Ok(text) => text,
                Err(e) => {
                    let _ = tx.send(ChatEvent::Error { message: e }).await;
                    let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;
                    break;
                }
            };

            let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;

            let sage_eval_clean = strip_decision(&sage_eval_text);
            agent_responses.push(("sage".to_string(), sage_eval_clean));

            let decision = parse_decision(&sage_eval_text);
            match decision {
                Some(d) if d.action == "continue" && !d.agents.is_empty() => {
                    agent_queue = d.agents;
                    // Reset cancel signal for next round
                    {
                        let mut signals = state.cancel_signals.lock().await;
                        let (new_tx, _) = watch::channel(false);
                        signals.insert(conv_id.clone(), new_tx);
                    }
                    let _ = tx
                        .send(ChatEvent::RoundStart {
                            round,
                            agents: agent_queue.clone(),
                        })
                        .await;
                    continue;
                }
                _ => break, // conclude
            }
        }

        // ── Normal: Sage evaluates ──
        round += 1;
        if round > max_rounds {
            break;
        }

        {
            let mut orchestrations = state.orchestrations.lock().await;
            if let Some(orch) = orchestrations.get_mut(&conv_id) {
                orch.phase = OrchestrationPhase::SageEvaluation;
                orch.agent_responses = agent_responses.clone();
                orch.round = round;
            }
        }

        let _ = tx
            .send(ChatEvent::AgentStart {
                agent_id: "sage".to_string(),
                agent_name: "Sage".to_string(),
                role: "pm".to_string(),
            })
            .await;

        let eval_prompt = build_sage_evaluation_prompt(
            &project_name,
            &board_state,
            &agent_responses,
            &mention_queue,
            round,
            max_rounds,
        );

        let sage_eval = claude::stream_chat_with_capture(
            &eval_prompt,
            &user_msgs,
            None,
            tx.clone(),
        )
        .await;

        let sage_eval_text = match sage_eval {
            Ok(text) => text,
            Err(e) => {
                let _ = tx.send(ChatEvent::Error { message: e }).await;
                let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;
                break;
            }
        };

        let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;

        let sage_eval_clean = strip_decision(&sage_eval_text);
        agent_responses.push(("sage".to_string(), sage_eval_clean));

        let decision = parse_decision(&sage_eval_text);
        match decision {
            Some(d) if d.action == "continue" && !d.agents.is_empty() => {
                // Merge decision agents with mention queue
                let mut next_agents = d.agents;
                for m in &mention_queue {
                    if !next_agents.contains(m) {
                        next_agents.push(m.clone());
                    }
                }
                agent_queue = next_agents;

                // Reset cancel signal for next round
                {
                    let mut signals = state.cancel_signals.lock().await;
                    let (new_tx, _) = watch::channel(false);
                    signals.insert(conv_id.clone(), new_tx);
                }

                let _ = tx
                    .send(ChatEvent::RoundStart {
                        round,
                        agents: agent_queue.clone(),
                    })
                    .await;
                continue;
            }
            _ => break, // conclude (default if no decision block found)
        }
    }

    // ── Done ──
    {
        let mut orchestrations = state.orchestrations.lock().await;
        if let Some(orch) = orchestrations.get_mut(&conv_id) {
            orch.phase = OrchestrationPhase::Complete;
            orch.agent_responses = agent_responses;
        }
    }

    cleanup_cancel_signal(&state, &conv_id).await;
    let _ = tx.send(ChatEvent::OrchestrationComplete).await;
}

/// Remove the cancel signal for a completed orchestration.
async fn cleanup_cancel_signal(state: &AppState, conv_id: &str) {
    let mut signals = state.cancel_signals.lock().await;
    signals.remove(conv_id);
}

/// Resume an orchestration after a tool result.
/// Continues the current agent, then runs remaining agents in the current round,
/// then enters the Sage evaluation loop.
pub async fn resume_orchestration(
    state: AppState,
    conv_id: String,
    tool_use_id: String,
    tool_result: String,
    board_state: String,
    tx: mpsc::Sender<ChatEvent>,
) {
    let orch = {
        let orchestrations = state.orchestrations.lock().await;
        match orchestrations.get(&conv_id) {
            Some(o) => o.clone(),
            None => {
                let _ = tx
                    .send(ChatEvent::Error {
                        message: "Orchestration not found".to_string(),
                    })
                    .await;
                return;
            }
        }
    };

    let current_agent = match &orch.current_agent {
        Some(a) => a.clone(),
        None => {
            let _ = tx
                .send(ChatEvent::Error {
                    message: "No current agent to resume".to_string(),
                })
                .await;
            return;
        }
    };

    let system_prompt = orch.current_system_prompt.clone().unwrap_or_default();
    let mut messages = orch.current_messages.clone();

    // Append the tool result
    messages.push(Message {
        role: "user".to_string(),
        content: MessageContent::Text(format!(
            "[Tool result for {}]: {}",
            tool_use_id, tool_result
        )),
    });

    // Continue streaming the current agent
    let agent = get_agent(&current_agent);
    if let Some(agent) = agent {
        let _ = tx
            .send(ChatEvent::AgentStart {
                agent_id: current_agent.clone(),
                agent_name: agent.name.to_string(),
                role: agent.role.to_string(),
            })
            .await;
    }

    // Get cancel_rx for cancellable streaming
    let cancel_rx = {
        let signals = state.cancel_signals.lock().await;
        match signals.get(&conv_id) {
            Some(tx) => tx.subscribe(),
            None => {
                // No cancel signal exists, create one
                drop(signals);
                let (cancel_tx, rx) = watch::channel(false);
                let mut signals = state.cancel_signals.lock().await;
                signals.insert(conv_id.clone(), cancel_tx);
                rx
            }
        }
    };

    let result = claude::stream_chat_with_capture_cancellable(
        &system_prompt,
        &messages,
        None,
        tx.clone(),
        cancel_rx.clone(),
    )
    .await;

    let mut agent_responses = orch.agent_responses.clone();
    let mut mention_queue: Vec<String> = Vec::new();
    let mut was_interrupted = false;

    match result {
        Ok(text) => {
            let mentions = parse_mentions(&text);
            for m in mentions {
                if !mention_queue.contains(&m) {
                    mention_queue.push(m);
                }
            }
            agent_responses.push((current_agent.clone(), text));
        }
        Err(StreamError::Cancelled(partial)) => {
            let marked = if partial.is_empty() {
                "[interrupted]".to_string()
            } else {
                format!("{partial}\n\n[interrupted]")
            };
            agent_responses.push((current_agent.clone(), marked));
            was_interrupted = true;
        }
        Err(StreamError::Failed(e)) => {
            let _ = tx.send(ChatEvent::Error { message: e }).await;
        }
    }

    let _ = tx.send(ChatEvent::AgentEnd { agent_id: current_agent }).await;

    if was_interrupted {
        // Handle like interjection in run_orchestration
        handle_post_round(
            state,
            conv_id,
            orch.project_id.clone(),
            orch.user_messages.clone(),
            board_state,
            agent_responses,
            orch.round,
            orch.max_rounds,
            tx,
        )
        .await;
        return;
    }

    // Run remaining agents in this round
    let project_name = &orch.project_id;
    let user_messages = &orch.user_messages;

    for agent_id in &orch.agent_queue {
        // Check for interjection
        {
            let orchestrations = state.orchestrations.lock().await;
            if let Some(orch) = orchestrations.get(&conv_id) {
                if orch.interrupted {
                    break;
                }
            }
        }

        let agent = match get_agent(agent_id) {
            Some(a) => a,
            None => continue,
        };

        let _ = tx
            .send(ChatEvent::AgentStart {
                agent_id: agent_id.clone(),
                agent_name: agent.name.to_string(),
                role: agent.role.to_string(),
            })
            .await;

        let agent_prompt = build_agent_orchestration_prompt(agent, project_name, &board_state);
        let agent_messages = build_conversation_for_agent(user_messages, &agent_responses);

        // Update state for potential further tool results
        {
            let mut orchestrations = state.orchestrations.lock().await;
            if let Some(orch) = orchestrations.get_mut(&conv_id) {
                orch.current_agent = Some(agent_id.clone());
                orch.current_system_prompt = Some(agent_prompt.clone());
                orch.current_messages = agent_messages.clone();
                orch.agent_responses = agent_responses.clone();
                let idx = orch.agent_queue.iter().position(|a| a == agent_id).unwrap_or(0);
                orch.agent_queue = orch.agent_queue[idx + 1..].to_vec();
            }
        }

        let result = claude::stream_chat_with_capture_cancellable(
            &agent_prompt,
            &agent_messages,
            None,
            tx.clone(),
            cancel_rx.clone(),
        )
        .await;

        match result {
            Ok(text) => {
                let mentions = parse_mentions(&text);
                for m in mentions {
                    if !mention_queue.contains(&m) {
                        mention_queue.push(m);
                    }
                }
                agent_responses.push((agent_id.clone(), text));
            }
            Err(StreamError::Cancelled(partial)) => {
                let marked = if partial.is_empty() {
                    "[interrupted]".to_string()
                } else {
                    format!("{partial}\n\n[interrupted]")
                };
                agent_responses.push((agent_id.clone(), marked));
                let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                break;
            }
            Err(StreamError::Failed(e)) => {
                let _ = tx.send(ChatEvent::Error { message: e }).await;
            }
        }

        let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
    }

    // After finishing remaining agents, enter Sage evaluation loop
    handle_post_round(
        state,
        conv_id,
        orch.project_id.clone(),
        orch.user_messages.clone(),
        board_state,
        agent_responses,
        orch.round,
        orch.max_rounds,
        tx,
    )
    .await;
}

/// Shared post-round logic: emit RoundEnd, handle interjections, run Sage evaluation loop.
/// Used by both `run_orchestration` (inline) and `resume_orchestration`.
async fn handle_post_round(
    state: AppState,
    conv_id: String,
    project_name: String,
    mut user_msgs: Vec<Message>,
    board_state: String,
    mut agent_responses: Vec<(String, String)>,
    start_round: u32,
    max_rounds: u32,
    tx: mpsc::Sender<ChatEvent>,
) {
    let mut round = start_round;

    let _ = tx.send(ChatEvent::RoundEnd { round }).await;

    loop {
        // ── Check for user interjection ──
        let interjection = {
            let mut orchestrations = state.orchestrations.lock().await;
            if let Some(orch) = orchestrations.get_mut(&conv_id) {
                if orch.interrupted {
                    let msg = orch.interjection_message.take();
                    orch.interrupted = false;
                    msg
                } else {
                    None
                }
            } else {
                None
            }
        };

        if let Some(interjection_text) = interjection {
            let _ = tx.send(ChatEvent::UserInterjectionAck).await;

            user_msgs.push(Message {
                role: "user".to_string(),
                content: MessageContent::Text(interjection_text.clone()),
            });

            round += 1;
            if round > max_rounds {
                break;
            }

            let _ = tx
                .send(ChatEvent::AgentStart {
                    agent_id: "sage".to_string(),
                    agent_name: "Sage".to_string(),
                    role: "pm".to_string(),
                })
                .await;

            let interjection_prompt = build_sage_interjection_prompt(
                &project_name,
                &board_state,
                &agent_responses,
                &interjection_text,
            );

            let sage_eval = claude::stream_chat_with_capture(
                &interjection_prompt,
                &user_msgs,
                None,
                tx.clone(),
            )
            .await;

            let sage_eval_text = match sage_eval {
                Ok(text) => text,
                Err(e) => {
                    let _ = tx.send(ChatEvent::Error { message: e }).await;
                    let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;
                    break;
                }
            };

            let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;

            let sage_eval_clean = strip_decision(&sage_eval_text);
            agent_responses.push(("sage".to_string(), sage_eval_clean));

            match parse_decision(&sage_eval_text) {
                Some(d) if d.action == "continue" && !d.agents.is_empty() => {
                    let agent_queue = d.agents;
                    // Reset cancel signal
                    {
                        let mut signals = state.cancel_signals.lock().await;
                        let (new_tx, _) = watch::channel(false);
                        signals.insert(conv_id.clone(), new_tx);
                    }

                    let _ = tx
                        .send(ChatEvent::RoundStart {
                            round,
                            agents: agent_queue.clone(),
                        })
                        .await;

                    // Run this round's agents
                    let cancel_rx = {
                        let signals = state.cancel_signals.lock().await;
                        signals.get(&conv_id).unwrap().subscribe()
                    };

                    let mut mention_queue: Vec<String> = Vec::new();

                    for agent_id in &agent_queue {
                        let agent = match get_agent(agent_id) {
                            Some(a) => a,
                            None => continue,
                        };

                        let _ = tx
                            .send(ChatEvent::AgentStart {
                                agent_id: agent_id.clone(),
                                agent_name: agent.name.to_string(),
                                role: agent.role.to_string(),
                            })
                            .await;

                        let agent_prompt = build_agent_orchestration_prompt(agent, &project_name, &board_state);
                        let agent_messages = build_conversation_for_agent(&user_msgs, &agent_responses);

                        {
                            let mut orchestrations = state.orchestrations.lock().await;
                            if let Some(orch) = orchestrations.get_mut(&conv_id) {
                                orch.current_agent = Some(agent_id.clone());
                                orch.current_system_prompt = Some(agent_prompt.clone());
                                orch.current_messages = agent_messages.clone();
                                orch.phase = OrchestrationPhase::RunningAgents;
                                orch.agent_responses = agent_responses.clone();
                                orch.round = round;
                            }
                        }

                        let result = claude::stream_chat_with_capture_cancellable(
                            &agent_prompt,
                            &agent_messages,
                            None,
                            tx.clone(),
                            cancel_rx.clone(),
                        )
                        .await;

                        match result {
                            Ok(text) => {
                                for m in parse_mentions(&text) {
                                    if !mention_queue.contains(&m) {
                                        mention_queue.push(m);
                                    }
                                }
                                agent_responses.push((agent_id.clone(), text));
                            }
                            Err(StreamError::Cancelled(partial)) => {
                                let marked = if partial.is_empty() {
                                    "[interrupted]".to_string()
                                } else {
                                    format!("{partial}\n\n[interrupted]")
                                };
                                agent_responses.push((agent_id.clone(), marked));
                                let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                                break;
                            }
                            Err(StreamError::Failed(e)) => {
                                let _ = tx.send(ChatEvent::Error { message: e }).await;
                            }
                        }

                        let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                    }

                    let _ = tx.send(ChatEvent::RoundEnd { round }).await;
                    // Loop back to check for interjection / sage evaluation
                    continue;
                }
                _ => break,
            }
        }

        // ── Normal: Sage evaluates ──
        round += 1;
        if round > max_rounds {
            break;
        }

        let _ = tx
            .send(ChatEvent::AgentStart {
                agent_id: "sage".to_string(),
                agent_name: "Sage".to_string(),
                role: "pm".to_string(),
            })
            .await;

        let eval_prompt = build_sage_evaluation_prompt(
            &project_name,
            &board_state,
            &agent_responses,
            &[], // no mention queue in resume path
            round,
            max_rounds,
        );

        let sage_eval = claude::stream_chat_with_capture(
            &eval_prompt,
            &user_msgs,
            None,
            tx.clone(),
        )
        .await;

        let sage_eval_text = match sage_eval {
            Ok(text) => text,
            Err(e) => {
                let _ = tx.send(ChatEvent::Error { message: e }).await;
                let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;
                break;
            }
        };

        let _ = tx.send(ChatEvent::AgentEnd { agent_id: "sage".to_string() }).await;

        let sage_eval_clean = strip_decision(&sage_eval_text);
        agent_responses.push(("sage".to_string(), sage_eval_clean));

        match parse_decision(&sage_eval_text) {
            Some(d) if d.action == "continue" && !d.agents.is_empty() => {
                let agent_queue = d.agents;
                // Reset cancel signal
                {
                    let mut signals = state.cancel_signals.lock().await;
                    let (new_tx, _) = watch::channel(false);
                    signals.insert(conv_id.clone(), new_tx);
                }

                let _ = tx
                    .send(ChatEvent::RoundStart {
                        round,
                        agents: agent_queue.clone(),
                    })
                    .await;

                let cancel_rx = {
                    let signals = state.cancel_signals.lock().await;
                    signals.get(&conv_id).unwrap().subscribe()
                };

                for agent_id in &agent_queue {
                    let agent = match get_agent(agent_id) {
                        Some(a) => a,
                        None => continue,
                    };

                    let _ = tx
                        .send(ChatEvent::AgentStart {
                            agent_id: agent_id.clone(),
                            agent_name: agent.name.to_string(),
                            role: agent.role.to_string(),
                        })
                        .await;

                    let agent_prompt = build_agent_orchestration_prompt(agent, &project_name, &board_state);
                    let agent_messages = build_conversation_for_agent(&user_msgs, &agent_responses);

                    {
                        let mut orchestrations = state.orchestrations.lock().await;
                        if let Some(orch) = orchestrations.get_mut(&conv_id) {
                            orch.current_agent = Some(agent_id.clone());
                            orch.current_system_prompt = Some(agent_prompt.clone());
                            orch.current_messages = agent_messages.clone();
                            orch.phase = OrchestrationPhase::RunningAgents;
                            orch.agent_responses = agent_responses.clone();
                            orch.round = round;
                        }
                    }

                    let result = claude::stream_chat_with_capture_cancellable(
                        &agent_prompt,
                        &agent_messages,
                        None,
                        tx.clone(),
                        cancel_rx.clone(),
                    )
                    .await;

                    match result {
                        Ok(text) => {
                            agent_responses.push((agent_id.clone(), text));
                        }
                        Err(StreamError::Cancelled(partial)) => {
                            let marked = if partial.is_empty() {
                                "[interrupted]".to_string()
                            } else {
                                format!("{partial}\n\n[interrupted]")
                            };
                            agent_responses.push((agent_id.clone(), marked));
                            let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                            break;
                        }
                        Err(StreamError::Failed(e)) => {
                            let _ = tx.send(ChatEvent::Error { message: e }).await;
                        }
                    }

                    let _ = tx.send(ChatEvent::AgentEnd { agent_id: agent_id.clone() }).await;
                }

                let _ = tx.send(ChatEvent::RoundEnd { round }).await;
                continue; // Loop back for next evaluation
            }
            _ => break,
        }
    }

    // ── Done ──
    {
        let mut orchestrations = state.orchestrations.lock().await;
        if let Some(orch) = orchestrations.get_mut(&conv_id) {
            orch.phase = OrchestrationPhase::Complete;
            orch.agent_responses = agent_responses;
        }
    }

    cleanup_cancel_signal(&state, &conv_id).await;
    let _ = tx.send(ChatEvent::OrchestrationComplete).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_handoff_valid() {
        let text = r#"Here's my analysis.

<handoff>
{"agents": ["atlas", "forge"], "summary": "Need architecture and implementation"}
</handoff>"#;

        let result = parse_handoff(text);
        assert!(result.is_some());
        let (agents, summary) = result.unwrap();
        assert_eq!(agents, vec!["atlas", "forge"]);
        assert_eq!(summary, "Need architecture and implementation");
    }

    #[test]
    fn test_parse_handoff_missing() {
        let text = "Just a regular response with no handoff.";
        assert!(parse_handoff(text).is_none());
    }

    #[test]
    fn test_parse_handoff_invalid_agent() {
        let text = r#"<handoff>
{"agents": ["nonexistent"], "summary": "test"}
</handoff>"#;
        assert!(parse_handoff(text).is_none());
    }

    #[test]
    fn test_strip_handoff() {
        let text = r#"Here's my analysis.

<handoff>
{"agents": ["atlas"], "summary": "test"}
</handoff>"#;

        let stripped = strip_handoff(text);
        assert_eq!(stripped, "Here's my analysis.");
    }

    #[test]
    fn test_parse_mentions() {
        let text = "I think @forge should review this, and @atlas might want to weigh in.";
        let mentions = parse_mentions(text);
        assert_eq!(mentions, vec!["forge", "atlas"]);
    }

    #[test]
    fn test_parse_mentions_no_duplicates() {
        let text = "@forge check this, also @forge please review";
        let mentions = parse_mentions(text);
        assert_eq!(mentions, vec!["forge"]);
    }

    #[test]
    fn test_parse_mentions_ignores_unknown() {
        let text = "@unknown and @sage should not appear, but @pixel should";
        let mentions = parse_mentions(text);
        assert_eq!(mentions, vec!["pixel"]);
    }

    #[test]
    fn test_parse_decision_continue() {
        let text = r#"The team should keep going.

<decision>
{"action": "continue", "agents": ["forge", "scout"], "summary": "Need implementation and testing"}
</decision>"#;

        let decision = parse_decision(text);
        assert!(decision.is_some());
        let d = decision.unwrap();
        assert_eq!(d.action, "continue");
        assert_eq!(d.agents, vec!["forge", "scout"]);
    }

    #[test]
    fn test_parse_decision_conclude() {
        let text = r#"Looks good.

<decision>
{"action": "conclude", "agents": [], "summary": "All points addressed"}
</decision>"#;

        let decision = parse_decision(text);
        assert!(decision.is_some());
        let d = decision.unwrap();
        assert_eq!(d.action, "conclude");
        assert!(d.agents.is_empty());
    }

    #[test]
    fn test_parse_decision_missing() {
        let text = "Just a regular response.";
        assert!(parse_decision(text).is_none());
    }
}
