mod config;
mod error;
mod state;
mod commands;
mod core;

pub use error::AppError;

use tauri::Manager;
use core::events::EventBus;
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let event_bus = EventBus::new(app.handle().clone());
            let state = AppState::new(event_bus);
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
