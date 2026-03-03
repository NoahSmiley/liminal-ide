use serde::Serialize;
use std::path::Path;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum PinnedContext {
    File { id: Uuid, path: String },
    Text { id: Uuid, label: String, content: String },
}

impl PinnedContext {
    pub fn id(&self) -> Uuid {
        match self {
            PinnedContext::File { id, .. } | PinnedContext::Text { id, .. } => *id,
        }
    }
}

pub struct ContextPinManager {
    pins: Mutex<Vec<PinnedContext>>,
}

impl ContextPinManager {
    pub fn new() -> Self {
        Self { pins: Mutex::new(Vec::new()) }
    }

    pub async fn pin_file(&self, path: String) -> PinnedContext {
        let pin = PinnedContext::File { id: Uuid::new_v4(), path };
        self.pins.lock().await.push(pin.clone());
        pin
    }

    pub async fn pin_text(&self, label: String, content: String) -> PinnedContext {
        let pin = PinnedContext::Text { id: Uuid::new_v4(), label, content };
        self.pins.lock().await.push(pin.clone());
        pin
    }

    pub async fn unpin(&self, id: Uuid) {
        let mut pins = self.pins.lock().await;
        pins.retain(|p| p.id() != id);
    }

    pub async fn list(&self) -> Vec<PinnedContext> {
        self.pins.lock().await.clone()
    }

    /// Read fresh content for all file pins, return formatted context block.
    pub async fn build_context_block(&self, project_root: &Path) -> String {
        let pins = self.pins.lock().await;
        let mut blocks: Vec<String> = Vec::new();

        for pin in pins.iter() {
            match pin {
                PinnedContext::File { path, .. } => {
                    let full = project_root.join(path);
                    if let Ok(content) = std::fs::read_to_string(&full) {
                        blocks.push(format!(
                            "<pinned-file path=\"{path}\">\n{content}\n</pinned-file>"
                        ));
                    }
                }
                PinnedContext::Text { label, content, .. } => {
                    blocks.push(format!(
                        "<pinned-context label=\"{label}\">\n{content}\n</pinned-context>"
                    ));
                }
            }
        }

        if blocks.is_empty() {
            String::new()
        } else {
            format!("\n\n--- Pinned Context ---\n{}", blocks.join("\n\n"))
        }
    }
}
