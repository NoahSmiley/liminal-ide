use crate::config::AppConfig;
use crate::core::ai_engine::AiEngine;
use crate::core::events::EventBus;
use crate::core::filesystem::FileSystemManager;
use crate::core::project::ProjectManager;
use crate::core::session::SessionManager;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
    pub project_manager: ProjectManager,
    pub fs_manager: FileSystemManager,
    pub session_manager: SessionManager,
    pub ai_engine: AiEngine,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        let config = AppConfig::default();
        let ai_engine = AiEngine::new(config.claude_model.clone());
        Self {
            config,
            event_bus,
            project_manager: ProjectManager::new(),
            fs_manager: FileSystemManager::new(),
            session_manager: SessionManager::new(),
            ai_engine,
        }
    }
}
