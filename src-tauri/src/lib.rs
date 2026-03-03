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
            commands::project::remove_project,
            commands::project::list_projects,
            commands::project::get_active_project,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::list_directory,
            commands::filesystem::list_tree,
            commands::filesystem::rename_file,
            commands::filesystem::delete_file,
            commands::session::create_session,
            commands::session::get_session,
            commands::session::list_sessions,
            commands::ai::send_message,
            commands::ai::cancel_message,
            commands::ai::check_claude_status,
            commands::terminal::spawn_terminal,
            commands::terminal::send_terminal_input,
            commands::terminal::list_terminals,
            commands::terminal::kill_terminal,
            commands::lsp::lsp_start,
            commands::lsp::lsp_stop,
            commands::lsp::lsp_open_document,
            commands::lsp::lsp_did_change,
            commands::lsp::lsp_close_document,
            commands::lsp::lsp_request_completion,
            commands::lsp::lsp_goto_definition,
            commands::lsp::lsp_hover,
            commands::changes::list_change_history,
            commands::changes::list_turn_changes,
            commands::changes::revert_turn,
            commands::context::pin_file,
            commands::context::pin_context,
            commands::context::unpin_context,
            commands::context::list_pinned,
            commands::summary::summarize_project,
            commands::diff_staging::get_staged_diffs,
            commands::diff_staging::accept_diff_file,
            commands::diff_staging::reject_diff_file,
            commands::diff_staging::accept_all_diffs,
            commands::diff_staging::reject_all_diffs,
            commands::editor_context::update_editor_context,
            commands::image::upload_image,
            commands::mention::resolve_mentions,
            commands::git::get_git_status,
            commands::git::get_git_log,
            commands::git::get_git_diff,
            commands::todo::scan_todos,
            commands::snippets::list_snippets,
            commands::snippets::add_snippet,
            commands::snippets::remove_snippet,
            commands::plugins::list_plugins,
            commands::plugins::run_plugin_command,
            commands::collab::collab_create_room,
            commands::collab::collab_join_room,
            commands::collab::collab_leave,
            commands::collab::collab_send_message,
            commands::collab::collab_set_user_name,
            commands::collab::collab_get_status,
            commands::debugger::debug_start,
            commands::debugger::debug_stop,
            commands::debugger::debug_set_breakpoint,
            commands::debugger::debug_remove_breakpoint,
            commands::debugger::debug_continue,
            commands::debugger::debug_step_over,
            commands::debugger::debug_step_into,
            commands::debugger::debug_step_out,
            commands::debugger::debug_get_session,
            commands::search::search_project,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::reset_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
