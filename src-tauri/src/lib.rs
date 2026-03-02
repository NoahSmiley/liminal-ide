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
        .invoke_handler(tauri::generate_handler![
            commands::project::create_project,
            commands::project::open_project,
            commands::project::list_projects,
            commands::project::get_active_project,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::list_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
