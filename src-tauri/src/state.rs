use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::config::AppConfig;
use crate::core::agents::AgentManager;
use crate::core::ai_engine::AiEngine;
use crate::core::change_tracker::ChangeTracker;
use crate::core::context_pin::ContextPinManager;
use crate::core::collab::CollabManager;
use crate::core::debugger::DebugManager;
use crate::core::diff_staging::DiffStager;
use crate::core::editor_context::EditorContextManager;
use crate::core::events::EventBus;
use crate::core::filesystem::FileSystemManager;
use crate::core::project::ProjectManager;
use crate::core::session::SessionManager;
use crate::core::lsp::LspManager;
use crate::core::plugins::PluginManager;
use crate::core::relay::RelayManager;
use crate::core::settings::SettingsManager;
use crate::core::snippets::SnippetManager;
use crate::core::terminal::TerminalManager;
use crate::core::watcher::WatcherHandle;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
    pub agent_manager: AgentManager,
    pub project_manager: ProjectManager,
    pub fs_manager: FileSystemManager,
    pub session_manager: SessionManager,
    pub ai_engine: AiEngine,
    pub terminal_manager: TerminalManager,
    pub lsp_manager: LspManager,
    pub settings_manager: SettingsManager,
    pub diff_stager: DiffStager,
    pub editor_context_manager: EditorContextManager,
    pub snippet_manager: SnippetManager,
    pub plugin_manager: PluginManager,
    pub collab_manager: CollabManager,
    pub context_pin_manager: ContextPinManager,
    pub debug_manager: DebugManager,
    pub relay_manager: RelayManager,
    change_tracker: Arc<ChangeTracker>,
    pub active_ai_task: Mutex<Option<JoinHandle<()>>>,
    pub file_watcher: Mutex<Option<WatcherHandle>>,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        let config = AppConfig::default();
        let ai_engine = AiEngine::new(config.claude_model.clone());
        let session_manager = SessionManager::with_data_dir(config.data_dir.clone());
        let project_manager = ProjectManager::with_data_dir(config.data_dir.clone());
        let settings_manager = SettingsManager::new(&config.data_dir);
        let snippet_manager = SnippetManager::new(&config.data_dir);
        let plugin_manager = PluginManager::new(&config.data_dir);
        let collab_manager = CollabManager::new(event_bus.clone());
        let debug_manager = DebugManager::new(event_bus.clone());
        let relay_manager = RelayManager::new(event_bus.clone(), &config.data_dir);
        Self {
            config,
            event_bus,
            agent_manager: AgentManager::new(),
            project_manager,
            fs_manager: FileSystemManager::new(),
            session_manager,
            ai_engine,
            terminal_manager: TerminalManager::new(),
            lsp_manager: LspManager::new(),
            settings_manager,
            diff_stager: DiffStager::new(),
            editor_context_manager: EditorContextManager::new(),
            snippet_manager,
            plugin_manager,
            collab_manager,
            context_pin_manager: ContextPinManager::new(),
            debug_manager,
            relay_manager,
            change_tracker: Arc::new(ChangeTracker::new()),
            active_ai_task: Mutex::new(None),
            file_watcher: Mutex::new(None),
        }
    }

    pub fn change_tracker_arc(&self) -> Arc<ChangeTracker> {
        self.change_tracker.clone()
    }
}
