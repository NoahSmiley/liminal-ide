use crate::config::AppConfig;
use crate::core::events::EventBus;
use crate::core::project::ProjectManager;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
    pub project_manager: ProjectManager,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            config: AppConfig::default(),
            event_bus,
            project_manager: ProjectManager::new(),
        }
    }
}
