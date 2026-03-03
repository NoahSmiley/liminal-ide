use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};

use crate::core::events::{AppEvent, EventBus, FsEvent};

const IGNORED_NAMES: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    ".DS_Store",
    "__pycache__",
    ".next",
    "dist",
    ".turbo",
];

pub struct WatcherHandle {
    _watcher: notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>,
}

pub fn start_watching(
    root: &Path,
    event_bus: EventBus,
) -> Result<WatcherHandle, String> {
    let root_str = root.display().to_string();
    let (tx, rx) = mpsc::channel();

    let mut debouncer = new_debouncer(Duration::from_millis(500), tx)
        .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let root_owned = root_str.clone();
    std::thread::spawn(move || {
        while let Ok(Ok(events)) = rx.recv() {
            let dominated_by_ignored = events.iter().all(|e| {
                e.path
                    .components()
                    .any(|c| IGNORED_NAMES.contains(&c.as_os_str().to_string_lossy().as_ref()))
            });

            if dominated_by_ignored {
                continue;
            }

            let has_changes = events
                .iter()
                .any(|e| matches!(e.kind, DebouncedEventKind::Any));

            if has_changes {
                event_bus.emit(AppEvent::Fs(FsEvent::TreeUpdated {
                    root: root_owned.clone(),
                }));
            }
        }
    });

    Ok(WatcherHandle { _watcher: debouncer })
}
