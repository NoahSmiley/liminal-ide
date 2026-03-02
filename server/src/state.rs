use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{watch, Mutex, Notify};

use crate::types::Message;

/// Active conversation state — tracks messages for multi-turn conversations
/// so we can feed tool results back and continue.
#[derive(Debug, Clone)]
pub struct ConversationState {
    pub project_id: String,
    pub agent_id: String,
    pub system_prompt: String,
    pub messages: Vec<Message>,
}

/// Phase of a multi-agent orchestration.
#[derive(Debug, Clone, PartialEq)]
pub enum OrchestrationPhase {
    Sage,
    RunningAgents,
    WaitingForToolResult,
    SageEvaluation,
    Interrupted,
    Complete,
}

/// Tracks the state of a multi-agent orchestration session.
#[derive(Debug, Clone)]
pub struct OrchestrationState {
    pub project_id: String,
    /// All agent responses accumulated so far (agent_id, text).
    pub agent_responses: Vec<(String, String)>,
    /// The original user messages.
    pub user_messages: Vec<Message>,
    /// Board state snapshot from frontend.
    pub board_state: String,
    /// Agents still queued to respond.
    pub agent_queue: Vec<String>,
    /// The agent currently generating a response.
    pub current_agent: Option<String>,
    /// Current phase.
    pub phase: OrchestrationPhase,
    /// System prompt for the current agent (needed for tool result resumption).
    pub current_system_prompt: Option<String>,
    /// Messages passed to the current agent (needed for tool result resumption).
    pub current_messages: Vec<Message>,
    /// Current round number (starts at 1).
    pub round: u32,
    /// Hard cap on rounds, default 5.
    pub max_rounds: u32,
    /// Agents @mentioned during the current round.
    pub mention_queue: Vec<String>,
    /// Set by the interjection endpoint to signal interruption.
    pub interrupted: bool,
    /// The user's interjection text.
    pub interjection_message: Option<String>,
}

/// Shared application state across request handlers.
#[derive(Clone)]
pub struct AppState {
    pub conversations: Arc<Mutex<HashMap<String, ConversationState>>>,
    pub orchestrations: Arc<Mutex<HashMap<String, OrchestrationState>>>,
    pub shutdown: Arc<Notify>,
    /// Cancel signals for active orchestrations, keyed by conversation ID.
    pub cancel_signals: Arc<Mutex<HashMap<String, watch::Sender<bool>>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            conversations: Arc::new(Mutex::new(HashMap::new())),
            orchestrations: Arc::new(Mutex::new(HashMap::new())),
            shutdown: Arc::new(Notify::new()),
            cancel_signals: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
