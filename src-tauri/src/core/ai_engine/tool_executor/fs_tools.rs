use std::path::Path;

use crate::core::events::FsEvent;
use crate::core::filesystem::FileSystemManager;
use crate::error::FsError;

use super::{error_outcome, input_str, ToolOutcome};

pub fn handle_write(fs: &FileSystemManager, root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let path = input_str(input, "file_path").or_else(|| input_str(input, "path"));
    let content = input_str(input, "content");

    let (Some(path), Some(content)) = (path, content) else {
        return error_outcome("Write requires 'file_path' and 'content'");
    };

    match fs.write_file(root, Path::new(&path), &content) {
        Ok(()) => ToolOutcome {
            output: format!("Created {path}"),
            is_error: false,
            fs_events: vec![FsEvent::FileCreated { path, content }],
        },
        Err(e) => error_outcome(&e.to_string()),
    }
}

pub fn handle_read(fs: &FileSystemManager, root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let path = input_str(input, "file_path").or_else(|| input_str(input, "path"));

    let Some(path) = path else {
        return error_outcome("Read requires 'file_path'");
    };

    match fs.read_file(root, Path::new(&path)) {
        Ok(fc) => ToolOutcome {
            output: fc.content,
            is_error: false,
            fs_events: vec![],
        },
        Err(e) => error_outcome(&e.to_string()),
    }
}

pub fn handle_edit(fs: &FileSystemManager, root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let path = input_str(input, "file_path").or_else(|| input_str(input, "path"));
    let old = input_str(input, "old_string");
    let new = input_str(input, "new_string");

    let (Some(path), Some(old), Some(new)) = (path, old, new) else {
        return error_outcome("Edit requires 'file_path', 'old_string', 'new_string'");
    };

    let content = match fs.read_file(root, Path::new(&path)) {
        Ok(fc) => fc.content,
        Err(FsError::NotFound(_)) => return error_outcome(&format!("File not found: {path}")),
        Err(e) => return error_outcome(&e.to_string()),
    };

    if !content.contains(&old) {
        return error_outcome("old_string not found in file");
    }

    let updated = content.replacen(&old, &new, 1);
    match fs.write_file(root, Path::new(&path), &updated) {
        Ok(()) => ToolOutcome {
            output: format!("Edited {path}"),
            is_error: false,
            fs_events: vec![FsEvent::FileModified { path, content: updated }],
        },
        Err(e) => error_outcome(&e.to_string()),
    }
}

pub fn handle_multi_edit(
    fs: &FileSystemManager,
    root: &Path,
    input: &serde_json::Value,
) -> ToolOutcome {
    let path = input_str(input, "file_path").or_else(|| input_str(input, "path"));
    let edits = input.get("edits").and_then(|v| v.as_array());

    let (Some(path), Some(edits)) = (path, edits) else {
        return error_outcome("MultiEdit requires 'file_path' and 'edits' array");
    };

    let mut content = match fs.read_file(root, Path::new(&path)) {
        Ok(fc) => fc.content,
        Err(FsError::NotFound(_)) => return error_outcome(&format!("File not found: {path}")),
        Err(e) => return error_outcome(&e.to_string()),
    };

    let mut applied = 0;
    for edit in edits {
        let old = edit.get("old_string").and_then(|v| v.as_str());
        let new = edit.get("new_string").and_then(|v| v.as_str());
        if let (Some(old), Some(new)) = (old, new) {
            if content.contains(old) {
                content = content.replacen(old, new, 1);
                applied += 1;
            }
        }
    }

    match fs.write_file(root, Path::new(&path), &content) {
        Ok(()) => ToolOutcome {
            output: format!("Applied {applied} edits to {path}"),
            is_error: false,
            fs_events: vec![FsEvent::FileModified { path, content }],
        },
        Err(e) => error_outcome(&e.to_string()),
    }
}

pub fn handle_ls(
    fs: &FileSystemManager,
    root: &Path,
    input: &serde_json::Value,
) -> ToolOutcome {
    let path = input_str(input, "path").unwrap_or_else(|| ".".to_string());

    match fs.list_directory(root, Path::new(&path)) {
        Ok(entries) => {
            let listing: Vec<String> = entries
                .iter()
                .map(|e| {
                    if e.is_dir {
                        format!("{}/ ", e.name)
                    } else {
                        e.name.clone()
                    }
                })
                .collect();
            ToolOutcome {
                output: listing.join("\n"),
                is_error: false,
                fs_events: vec![],
            }
        }
        Err(e) => error_outcome(&e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn test_dir(name: &str) -> std::path::PathBuf {
        let dir = env::temp_dir().join(format!("liminal-fs-tools-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    fn json(pairs: &[(&str, &str)]) -> serde_json::Value {
        let map: serde_json::Map<String, serde_json::Value> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), serde_json::Value::String(v.to_string())))
            .collect();
        serde_json::Value::Object(map)
    }

    #[test]
    fn write_creates_file() {
        let root = test_dir("write");
        let fs = FileSystemManager::new();
        let input = json(&[("file_path", "hello.txt"), ("content", "world")]);
        let out = handle_write(&fs, &root, &input);
        assert!(!out.is_error);
        assert!(out.output.contains("hello.txt"));
        assert_eq!(out.fs_events.len(), 1);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn read_returns_content() {
        let root = test_dir("read");
        let fs = FileSystemManager::new();
        std::fs::write(root.join("test.txt"), "abc").unwrap();
        let input = json(&[("file_path", "test.txt")]);
        let out = handle_read(&fs, &root, &input);
        assert!(!out.is_error);
        assert_eq!(out.output, "abc");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn edit_replaces_string() {
        let root = test_dir("edit");
        let fs = FileSystemManager::new();
        std::fs::write(root.join("f.txt"), "hello world").unwrap();
        let input = json(&[("file_path", "f.txt"), ("old_string", "hello"), ("new_string", "hi")]);
        let out = handle_edit(&fs, &root, &input);
        assert!(!out.is_error);
        let content = std::fs::read_to_string(root.join("f.txt")).unwrap();
        assert_eq!(content, "hi world");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn multi_edit_applies_sequentially() {
        let root = test_dir("multi");
        let fs = FileSystemManager::new();
        std::fs::write(root.join("m.txt"), "aaa bbb ccc").unwrap();
        let input = serde_json::json!({
            "file_path": "m.txt",
            "edits": [
                { "old_string": "aaa", "new_string": "xxx" },
                { "old_string": "bbb", "new_string": "yyy" }
            ]
        });
        let out = handle_multi_edit(&fs, &root, &input);
        assert!(!out.is_error);
        assert!(out.output.contains("2 edits"));
        let content = std::fs::read_to_string(root.join("m.txt")).unwrap();
        assert_eq!(content, "xxx yyy ccc");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ls_lists_entries() {
        let root = test_dir("ls");
        let fs = FileSystemManager::new();
        std::fs::create_dir(root.join("sub")).unwrap();
        std::fs::write(root.join("a.txt"), "x").unwrap();
        let input = json(&[("path", ".")]);
        let out = handle_ls(&fs, &root, &input);
        assert!(!out.is_error);
        assert!(out.output.contains("sub/"));
        assert!(out.output.contains("a.txt"));
        let _ = std::fs::remove_dir_all(&root);
    }
}
