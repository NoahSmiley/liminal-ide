use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct EditorContext {
    pub active_file: Option<String>,
    pub cursor_line: Option<usize>,
    pub cursor_col: Option<usize>,
    pub selected_text: Option<String>,
}

pub struct EditorContextManager {
    current: Mutex<EditorContext>,
}

impl EditorContextManager {
    pub fn new() -> Self {
        Self { current: Mutex::new(EditorContext::default()) }
    }

    pub async fn update(&self, ctx: EditorContext) {
        *self.current.lock().await = ctx;
    }

    pub async fn get(&self) -> EditorContext {
        self.current.lock().await.clone()
    }

    pub async fn format_for_prompt(&self) -> String {
        let ctx = self.current.lock().await;
        if ctx.active_file.is_none() {
            return String::new();
        }
        let mut block = String::from("\n<editor-context>\n");
        if let Some(ref file) = ctx.active_file {
            block.push_str(&format!("  Active file: {}\n", file));
        }
        if let (Some(line), Some(col)) = (ctx.cursor_line, ctx.cursor_col) {
            block.push_str(&format!("  Cursor: line {}, col {}\n", line, col));
        }
        if let Some(ref text) = ctx.selected_text {
            if !text.is_empty() {
                let preview = if text.len() > 500 {
                    format!("{}... ({} chars)", &text[..500], text.len())
                } else {
                    text.clone()
                };
                block.push_str(&format!("  Selected text:\n{}\n", preview));
            }
        }
        block.push_str("</editor-context>");
        block
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn new_starts_with_empty_context() {
        let mgr = EditorContextManager::new();
        let ctx = mgr.get().await;
        assert!(ctx.active_file.is_none());
        assert!(ctx.cursor_line.is_none());
        assert!(ctx.cursor_col.is_none());
        assert!(ctx.selected_text.is_none());
    }

    #[tokio::test]
    async fn update_then_get_returns_updated_value() {
        let mgr = EditorContextManager::new();
        mgr.update(EditorContext {
            active_file: Some("src/main.rs".to_string()),
            cursor_line: Some(10),
            cursor_col: Some(5),
            selected_text: Some("let x = 1;".to_string()),
        }).await;
        let ctx = mgr.get().await;
        assert_eq!(ctx.active_file.as_deref(), Some("src/main.rs"));
        assert_eq!(ctx.cursor_line, Some(10));
        assert_eq!(ctx.cursor_col, Some(5));
        assert_eq!(ctx.selected_text.as_deref(), Some("let x = 1;"));
    }

    #[tokio::test]
    async fn format_for_prompt_empty_when_no_active_file() {
        let mgr = EditorContextManager::new();
        let prompt = mgr.format_for_prompt().await;
        assert!(prompt.is_empty());
    }

    #[tokio::test]
    async fn format_for_prompt_includes_file_cursor_selected() {
        let mgr = EditorContextManager::new();
        mgr.update(EditorContext {
            active_file: Some("lib.rs".to_string()),
            cursor_line: Some(42),
            cursor_col: Some(8),
            selected_text: Some("fn test()".to_string()),
        }).await;
        let prompt = mgr.format_for_prompt().await;
        assert!(prompt.contains("lib.rs"));
        assert!(prompt.contains("line 42"));
        assert!(prompt.contains("col 8"));
        assert!(prompt.contains("fn test()"));
        assert!(prompt.contains("<editor-context>"));
        assert!(prompt.contains("</editor-context>"));
    }
}
