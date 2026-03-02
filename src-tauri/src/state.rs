use crate::config::AppConfig;
use crate::core::events::EventBus;
use crate::core::filesystem::FileSystemManager;
use crate::core::project::ProjectManager;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
    pub project_manager: ProjectManager,
    pub fs_manager: FileSystemManager,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            config: AppConfig::default(),
            event_bus,
            project_manager: ProjectManager::new(),
            fs_manager: FileSystemManager::new(),
        }
    }
}
