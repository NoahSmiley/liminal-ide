use std::path::Path;

use super::Snippet;

pub fn load_snippets(data_dir: &Path) -> Vec<Snippet> {
    let path = data_dir.join("snippets.json");
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

pub fn save_snippets(data_dir: &Path, snippets: &[Snippet]) -> Result<(), String> {
    let path = data_dir.join("snippets.json");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(snippets)
        .map_err(|e| e.to_string())?;
    std::fs::write(&path, json)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_snippets_returns_empty_when_file_missing() {
        let tmp = tempfile::tempdir().unwrap();
        let result = load_snippets(tmp.path());
        assert!(result.is_empty());
    }

    #[test]
    fn save_then_load_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let snippets = vec![
            Snippet {
                id: "test-1".to_string(),
                title: "Hello".to_string(),
                language: "rust".to_string(),
                content: "fn main() {}".to_string(),
            },
        ];
        save_snippets(tmp.path(), &snippets).unwrap();
        let loaded = load_snippets(tmp.path());
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].id, "test-1");
        assert_eq!(loaded[0].title, "Hello");
        assert_eq!(loaded[0].language, "rust");
        assert_eq!(loaded[0].content, "fn main() {}");
    }
}
