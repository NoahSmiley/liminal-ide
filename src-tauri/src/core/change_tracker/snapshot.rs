use std::path::Path;

/// Read the current content of a file before AI overwrites it.
/// Returns None if the file does not yet exist (new file creation).
pub fn read_before(project_root: &Path, relative_path: &str) -> Option<String> {
    let full = project_root.join(relative_path);
    std::fs::read_to_string(full).ok()
}
