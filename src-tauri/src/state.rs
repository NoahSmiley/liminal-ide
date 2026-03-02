use crate::config::AppConfig;
use crate::core::events::EventBus;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            config: AppConfig::default(),
            event_bus,
        }
    }
}
