pub mod item;
#[cfg(test)]
mod tests;

use std::path::Path;

use crate::core::search::ignore::{load_gitignore, should_ignore};
use item::{TodoItem, TodoKind};

pub fn scan_todos(project_root: &Path) -> Vec<TodoItem> {
    let gitignore = load_gitignore(project_root);
    let mut items = Vec::new();
    walk_for_todos(project_root, project_root, &gitignore, &mut items);
    items
}

fn walk_for_todos(
    root: &Path,
    dir: &Path,
    gitignore: &[String],
    items: &mut Vec<TodoItem>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if should_ignore(&path, gitignore) { continue; }
        if path.is_dir() {
            walk_for_todos(root, &path, gitignore, items);
        } else if path.is_file() {
            scan_file(root, &path, items);
        }
    }
}

fn scan_file(root: &Path, path: &Path, items: &mut Vec<TodoItem>) {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return,
    };
    let rel = path.strip_prefix(root).unwrap_or(path);

    for (idx, line) in content.lines().enumerate() {
        for pattern in TodoKind::all_patterns() {
            if let Some(pos) = line.find(pattern) {
                let text = line[pos + pattern.len()..].trim_start_matches(&[':', ' ', '('][..]).to_string();
                if let Some(kind) = TodoKind::from_tag(pattern) {
                    items.push(TodoItem {
                        path: rel.display().to_string(),
                        line_number: idx + 1,
                        kind,
                        text,
                    });
                }
                break; // one match per line
            }
        }
    }
}
