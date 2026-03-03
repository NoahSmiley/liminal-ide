use super::*;

#[tokio::test]
async fn add_creates_snippet_with_uuid() {
    let tmp = tempfile::tempdir().unwrap();
    let mgr = SnippetManager::new(tmp.path());
    let snippet = mgr
        .add("Test".into(), "rust".into(), "fn main() {}".into())
        .await
        .unwrap();
    assert!(!snippet.id.is_empty());
    assert_eq!(snippet.title, "Test");
    assert_eq!(snippet.language, "rust");
    // UUID v4 format: 8-4-4-4-12 hex chars
    assert_eq!(snippet.id.len(), 36);
}

#[tokio::test]
async fn list_returns_all_snippets() {
    let tmp = tempfile::tempdir().unwrap();
    let mgr = SnippetManager::new(tmp.path());
    mgr.add("A".into(), "js".into(), "console.log()".into()).await.unwrap();
    mgr.add("B".into(), "py".into(), "print()".into()).await.unwrap();
    let list = mgr.list().await;
    assert_eq!(list.len(), 2);
}

#[tokio::test]
async fn remove_deletes_by_id() {
    let tmp = tempfile::tempdir().unwrap();
    let mgr = SnippetManager::new(tmp.path());
    let s = mgr.add("Del".into(), "go".into(), "package main".into()).await.unwrap();
    mgr.remove(&s.id).await.unwrap();
    let list = mgr.list().await;
    assert!(list.is_empty());
}

#[tokio::test]
async fn persistence_survives_reload() {
    let tmp = tempfile::tempdir().unwrap();
    let mgr = SnippetManager::new(tmp.path());
    let s = mgr
        .add("Persist".into(), "rs".into(), "let x = 1;".into())
        .await
        .unwrap();
    // Create a new manager reading from the same directory
    let mgr2 = SnippetManager::new(tmp.path());
    let list = mgr2.list().await;
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, s.id);
    assert_eq!(list[0].title, "Persist");
}
