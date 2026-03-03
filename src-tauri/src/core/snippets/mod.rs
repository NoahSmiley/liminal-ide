pub mod storage;
#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub title: String,
    pub language: String,
    pub content: String,
}

pub struct SnippetManager {
    snippets: Mutex<Vec<Snippet>>,
    data_dir: std::path::PathBuf,
}

impl SnippetManager {
    pub fn new(data_dir: &Path) -> Self {
        let snippets = storage::load_snippets(data_dir);
        Self {
            snippets: Mutex::new(snippets),
            data_dir: data_dir.to_path_buf(),
        }
    }

    pub async fn list(&self) -> Vec<Snippet> {
        self.snippets.lock().await.clone()
    }

    pub async fn add(&self, title: String, language: String, content: String) -> Result<Snippet, String> {
        let snippet = Snippet {
            id: Uuid::new_v4().to_string(),
            title, language, content,
        };
        let mut snippets = self.snippets.lock().await;
        snippets.push(snippet.clone());
        storage::save_snippets(&self.data_dir, &snippets)?;
        Ok(snippet)
    }

    pub async fn remove(&self, id: &str) -> Result<(), String> {
        let mut snippets = self.snippets.lock().await;
        snippets.retain(|s| s.id != id);
        storage::save_snippets(&self.data_dir, &snippets)?;
        Ok(())
    }
}
