#![allow(dead_code)]

mod claude;
mod orchestration;
mod state;
mod tools;
mod types;

use axum::{
    extract::State,
    http::{HeaderValue, Method},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Json,
    },
    routing::{get, post},
    Router,
};
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use tower_http::cors::CorsLayer;

use crate::state::{AppState, OrchestrationPhase, OrchestrationState};
use crate::types::{
    ChatEvent, ChatRequest, HealthResponse, TeamChatRequest, TeamInterjectionRequest,
    TeamToolResultRequest, ToolResultRequest,
};

#[tokio::main]
async fn main() {
    let state = AppState::new();
    let shutdown_tx = state.shutdown.clone();

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:1420".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/chat", post(chat))
        .route("/api/tool-result", post(tool_result))
        .route("/api/team-chat", post(team_chat))
        .route("/api/team-tool-result", post(team_tool_result))
        .route("/api/team-interject", post(team_interject))
        .route("/api/restart", post(restart))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:3456";
    println!("liminal server listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            shutdown_tx.notified().await;
            println!("shutting down for restart...");
        })
        .await
        .unwrap();
}

/// POST /api/restart — gracefully shut down the server (wrapper script restarts it)
async fn restart(State(state): State<AppState>) -> Json<serde_json::Value> {
    // Notify on a slight delay so the response can be sent first
    let shutdown = state.shutdown.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        shutdown.notify_one();
    });
    Json(serde_json::json!({ "ok": true, "message": "restarting" }))
}

/// GET /api/health — check if server and claude CLI are available
async fn health() -> Json<HealthResponse> {
    let claude_available = claude::check_available().await;
    Json(HealthResponse {
        ok: true,
        claude_available,
    })
}

/// POST /api/chat — start a streaming chat with Claude
async fn chat(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> impl IntoResponse {
    let (tx, rx) = mpsc::channel::<ChatEvent>(64);

    // Generate a conversation ID
    let conv_id = uuid::Uuid::new_v4().to_string();

    // Build system prompt from request or use a default
    let system_prompt = req.system_prompt.unwrap_or_else(|| {
        format!(
            "You are a helpful AI assistant on the Liminal project management platform. \
             Agent role: {}. Be concise and use markdown.",
            req.agent_id
        )
    });

    // Store conversation state for potential tool result follow-ups
    {
        let mut convs = state.conversations.lock().await;
        convs.insert(
            conv_id.clone(),
            crate::state::ConversationState {
                project_id: req.project_id.clone(),
                agent_id: req.agent_id.clone(),
                system_prompt: system_prompt.clone(),
                messages: req.messages.clone(),
            },
        );
    }

    // Send conversation ID as first event
    let conv_id_clone = conv_id.clone();
    let _ = tx
        .send(ChatEvent::ConversationId {
            id: conv_id_clone,
        })
        .await;

    // Spawn the claude CLI streaming in a background task
    let messages = req.messages.clone();
    let tools = req.tools;
    tokio::spawn(async move {
        if let Err(e) =
            claude::stream_chat(&system_prompt, &messages, tools.as_deref(), tx.clone()).await
        {
            let _ = tx.send(ChatEvent::Error { message: e }).await;
        }
    });

    // Convert the receiver into an SSE stream
    let stream = ReceiverStream::new(rx).map(|event| {
        let data = serde_json::to_string(&event).unwrap_or_default();
        Ok::<_, Infallible>(Event::default().data(data))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// POST /api/tool-result — send a tool execution result back to continue the conversation
async fn tool_result(
    State(state): State<AppState>,
    Json(req): Json<ToolResultRequest>,
) -> impl IntoResponse {
    let (tx, rx) = mpsc::channel::<ChatEvent>(64);

    // Look up the conversation and append the tool result
    let conv = {
        let mut convs = state.conversations.lock().await;
        match convs.get_mut(&req.conversation_id) {
            Some(conv) => {
                // Add the tool result as a user message with context
                conv.messages.push(types::Message {
                    role: "user".to_string(),
                    content: types::MessageContent::Text(format!(
                        "[Tool result for {}]: {}",
                        req.tool_use_id, req.result
                    )),
                });
                Some(conv.clone())
            }
            None => None,
        }
    };

    match conv {
        Some(conv) => {
            let system_prompt = conv.system_prompt.clone();
            let messages = conv.messages.clone();

            tokio::spawn(async move {
                if let Err(e) =
                    claude::stream_chat(&system_prompt, &messages, None, tx.clone()).await
                {
                    let _ = tx.send(ChatEvent::Error { message: e }).await;
                }
            });
        }
        None => {
            let _ = tx
                .send(ChatEvent::Error {
                    message: "Conversation not found".to_string(),
                })
                .await;
        }
    }

    let stream = ReceiverStream::new(rx).map(|event| {
        let data = serde_json::to_string(&event).unwrap_or_default();
        Ok::<_, Infallible>(Event::default().data(data))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// POST /api/team-chat — start a multi-agent orchestrated chat
async fn team_chat(
    State(state): State<AppState>,
    Json(req): Json<TeamChatRequest>,
) -> impl IntoResponse {
    let (tx, rx) = mpsc::channel::<ChatEvent>(64);

    let conv_id = uuid::Uuid::new_v4().to_string();
    let board_state = req.board_state.unwrap_or_else(|| "No tasks yet".to_string());

    // Store orchestration state
    {
        let mut orchestrations = state.orchestrations.lock().await;
        orchestrations.insert(
            conv_id.clone(),
            OrchestrationState {
                project_id: req.project_id.clone(),
                agent_responses: Vec::new(),
                user_messages: req.messages.clone(),
                board_state: board_state.clone(),
                agent_queue: Vec::new(),
                current_agent: None,
                phase: OrchestrationPhase::Sage,
                current_system_prompt: None,
                current_messages: Vec::new(),
                round: 1,
                max_rounds: 3,
                mention_queue: Vec::new(),
                interrupted: false,
                interjection_message: None,
            },
        );
    }

    let state_clone = state.clone();
    let conv_id_clone = conv_id.clone();
    let project_id = req.project_id.clone();
    let messages = req.messages.clone();

    tokio::spawn(async move {
        orchestration::run_orchestration(
            state_clone,
            conv_id_clone,
            project_id,
            messages,
            board_state,
            tx,
        )
        .await;
    });

    let stream = ReceiverStream::new(rx).map(|event| {
        let data = serde_json::to_string(&event).unwrap_or_default();
        Ok::<_, Infallible>(Event::default().data(data))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// POST /api/team-tool-result — send a tool result back during team orchestration
async fn team_tool_result(
    State(state): State<AppState>,
    Json(req): Json<TeamToolResultRequest>,
) -> impl IntoResponse {
    let (tx, rx) = mpsc::channel::<ChatEvent>(64);

    let board_state = req.board_state.unwrap_or_else(|| "No tasks yet".to_string());

    let state_clone = state.clone();
    let conv_id = req.conversation_id.clone();
    let tool_use_id = req.tool_use_id.clone();
    let result = req.result.clone();

    tokio::spawn(async move {
        orchestration::resume_orchestration(
            state_clone,
            conv_id,
            tool_use_id,
            result,
            board_state,
            tx,
        )
        .await;
    });

    let stream = ReceiverStream::new(rx).map(|event| {
        let data = serde_json::to_string(&event).unwrap_or_default();
        Ok::<_, Infallible>(Event::default().data(data))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// POST /api/team-interject — interrupt a running team orchestration with a user message
async fn team_interject(
    State(state): State<AppState>,
    Json(req): Json<TeamInterjectionRequest>,
) -> Json<serde_json::Value> {
    let conv_id = req.conversation_id;

    // Update orchestration state with interjection
    {
        let mut orchestrations = state.orchestrations.lock().await;
        if let Some(orch) = orchestrations.get_mut(&conv_id) {
            orch.interrupted = true;
            orch.interjection_message = Some(req.message);
            if let Some(bs) = req.board_state {
                orch.board_state = bs;
            }
        } else {
            return Json(serde_json::json!({ "ok": false, "error": "Orchestration not found" }));
        }
    }

    // Send cancel signal to abort current agent stream
    {
        let signals = state.cancel_signals.lock().await;
        if let Some(cancel_tx) = signals.get(&conv_id) {
            let _ = cancel_tx.send(true);
        }
    }

    Json(serde_json::json!({ "ok": true }))
}
