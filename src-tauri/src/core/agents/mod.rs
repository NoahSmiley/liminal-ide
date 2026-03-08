pub mod storage;

use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AgentTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub system_prompt: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub allowed_tools: Option<Vec<String>>,
    #[serde(default)]
    pub avatar: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
}

pub struct AgentManager {
    active: Mutex<Option<AgentTemplate>>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            active: Mutex::new(None),
        }
    }

    pub fn list(project_root: Option<&Path>) -> Vec<AgentTemplate> {
        let mut agents = Vec::new();

        // Project-local agents
        if let Some(root) = project_root {
            let local_dir = root.join(".claude").join("agents");
            if local_dir.is_dir() {
                storage::scan_agents(&local_dir, &mut agents);
            }
        }

        // Global agents (~/.claude/agents/)
        if let Some(home) = dirs_next::home_dir() {
            let global_dir = home.join(".claude").join("agents");
            if global_dir.is_dir() {
                storage::scan_agents(&global_dir, &mut agents);
            }
        }

        agents
    }

    pub fn save(project_root: &Path, template: &AgentTemplate) -> Result<(), String> {
        let dir = project_root.join(".claude").join("agents");
        storage::save_agent(&dir, template)
    }

    pub fn delete(project_root: &Path, id: &str) -> Result<(), String> {
        let dir = project_root.join(".claude").join("agents");
        storage::delete_agent(&dir, id)
    }

    pub async fn set_active(&self, template: Option<AgentTemplate>) {
        *self.active.lock().await = template;
    }

    pub async fn get_active(&self) -> Option<AgentTemplate> {
        self.active.lock().await.clone()
    }
}
